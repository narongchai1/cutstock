<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Lot;
use App\Models\Product;
use App\Models\StockIn;
use App\Models\SyncBatch;
use App\Services\RealtimePublisher;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class SyncController extends Controller
{
    // จุดรับ request จาก frontend
    public function sync(Request $request)
    {
        $data = $request->validate([
            'sync_id' => ['nullable', 'uuid'],
            'device_id' => ['nullable', 'string', 'max:255'],
            'include_stock' => ['sometimes', 'boolean'],
            'stock_key' => ['sometimes', 'in:id,barcode,name'],

            'movements' => ['sometimes', 'array'],
            'movements.*.type' => ['required_with:movements', 'in:IN,OUT'],
            'movements.*.product_id' => ['required_with:movements', 'integer', 'exists:products,id'],
            'movements.*.qty' => ['nullable', 'numeric', 'min:0.01'],
            'movements.*.quantity' => ['nullable', 'numeric', 'min:0.01'],
            'movements.*.lot_id' => ['nullable', 'integer', 'exists:lots,id'],
            'movements.*.expiry_date' => ['nullable', 'date'],
            'movements.*.supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'movements.*.warranty' => ['nullable', 'string', 'max:255'],
            'movements.*.unit_price' => ['nullable', 'numeric', 'min:0'],
            'movements.*.invoice_id' => ['nullable', 'integer', 'exists:invoices,id'],
            'movements.*.issued_at' => ['nullable', 'date'],
            'movements.*.user_id' => ['nullable', 'integer', 'exists:users,id'],

            'stock_ins' => ['sometimes', 'array'],
            'stock_ins.*.product_id' => ['required_with:stock_ins', 'integer', 'exists:products,id'],
            'stock_ins.*.qty' => ['nullable', 'numeric', 'min:0.01'],
            'stock_ins.*.quantity' => ['nullable', 'numeric', 'min:0.01'],
            'stock_ins.*.lot_id' => ['nullable', 'integer', 'exists:lots,id'],
            'stock_ins.*.expiry_date' => ['nullable', 'date'],
            'stock_ins.*.supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'stock_ins.*.warranty' => ['nullable', 'string', 'max:255'],

            'invoice_items' => ['sometimes', 'array'],
            'invoice_items.*.product_id' => ['required_with:invoice_items', 'integer', 'exists:products,id'],
            'invoice_items.*.qty' => ['nullable', 'numeric', 'min:0.01'],
            'invoice_items.*.quantity' => ['nullable', 'numeric', 'min:0.01'],
            'invoice_items.*.unit_price' => ['nullable', 'numeric', 'min:0'],
            'invoice_items.*.lot_id' => ['nullable', 'integer', 'exists:lots,id'],
            'invoice_items.*.invoice_id' => ['nullable', 'integer', 'exists:invoices,id'],
            'invoice_items.*.issued_at' => ['nullable', 'date'],
            'invoice_items.*.user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);
         // เช็คว่ามีอะไรให้ sync ไหม
        $hasAny = !empty($data['movements']) || !empty($data['stock_ins']) || !empty($data['invoice_items']);
        if (!$hasAny) {
            return response()->json([
                'status' => 'error',
                'message' => 'No sync data provided.',
            ], 422);
        }

        $syncId = $data['sync_id'] ?? null;
        $user = $request->user();
        $includeStock = (bool) ($data['include_stock'] ?? false);
        $stockKey = (string) ($data['stock_key'] ?? 'id');
        $userId = $user?->id;

        //กัน sync ซ้ำ (SyncBatch)
        if ($syncId) {
            $existing = SyncBatch::query()->where('sync_id', $syncId)->first();
            if ($existing && $existing->response_json) {
                return response()->json($existing->response_json);
            }
        }
        // normalizeEvents() — รวมข้อมูลให้เป็น “movement เดียวกัน”
        $events = $this->normalizeEvents($data);
        $deviceId = $data['device_id'] ?? null;

        $response = DB::transaction(function () use ($events, $syncId, $deviceId, $user, $includeStock, $stockKey) {
            $stockInIds = [];
            $invoiceIds = [];
            $invoiceItemIds = [];
            $lotIds = [];
            $errors = [];

            $appliedIn = 0;
            $appliedOut = 0;

            foreach ($events as $i => $event) {
                try {
                    if ($event['type'] === 'IN') {
                        // Each event runs in its own savepoint so failures don't partially apply.
                        $result = DB::transaction(fn () => $this->applyStockIn($event));
                        $appliedIn++;
                        $stockInIds[] = $result['stock_in_id'];
                        if (!empty($result['lot_id'])) {
                            $lotIds[] = $result['lot_id'];
                        }
                    } elseif ($event['type'] === 'OUT') {
                        $result = DB::transaction(fn () => $this->applyStockOut($event));
                        $appliedOut++;
                        $invoiceIds[] = $result['invoice_id'];
                        $invoiceItemIds[] = $result['invoice_item_id'];
                    } else {
                        $errors[] = [
                            'index' => $i,
                            'type' => $event['type'] ?? null,
                            'message' => 'Unknown movement type.',
                        ];
                    }
                } catch (\Throwable $e) {
                    $errors[] = [
                        'index' => $i,
                        'type' => $event['type'] ?? null,
                        'product_id' => $event['product_id'] ?? null,
                        'message' => $e->getMessage(),
                    ];
                }
            }

            $payload = [
                'status' => 'ok',
                'sync_id' => $syncId,
                'server_time' => Carbon::now()->toIso8601String(),
                'applied' => [
                    'stock_ins' => $appliedIn,
                    'stock_outs' => $appliedOut,
                ],
                'created' => [
                    'stock_in_ids' => $stockInIds,
                    'invoice_ids' => array_values(array_unique($invoiceIds)),
                    'invoice_item_ids' => $invoiceItemIds,
                    'lot_ids' => array_values(array_unique($lotIds)),
                ],
                'errors' => $errors,
            ];

            if ($includeStock) {
                $payload['stock'] = $this->buildStockSnapshot($events, $stockKey);
            }

            $productIdsForRealtime = array_values(array_unique(array_filter(array_map(
                fn ($event) => isset($event['product_id']) ? (int) $event['product_id'] : 0,
                $events
            ), fn ($id) => $id > 0)));
            if (!empty($productIdsForRealtime)) {
                DB::afterCommit(function () use ($productIdsForRealtime, $syncId, $deviceId, $userId) {
                    app(RealtimePublisher::class)->stockChanged($productIdsForRealtime, [
                        'sync_id' => $syncId,
                        'device_id' => $deviceId,
                        'user_id' => $userId,
                        'source' => 'sync',
                    ]);
                });
            }

            if ($syncId) {
                SyncBatch::query()->create([
                    'sync_id' => $syncId,
                    'user_id' => $userId,
                    'device_id' => $deviceId,
                    'status' => empty($errors) ? 'applied' : 'applied_with_errors',
                    'request_json' => $events,
                    'response_json' => $payload,
                ]);
            }

            return $payload;
        });

        return response()->json($response);
    }

    private function buildStockSnapshot(array $events, string $stockKey): array
    {
        $productIds = [];
        foreach ($events as $event) {
            if (isset($event['product_id'])) {
                $productIds[] = (int) $event['product_id'];
            }
        }

        $productIds = array_values(array_unique(array_filter($productIds, fn ($id) => $id > 0)));
        if (empty($productIds)) {
            return [];
        }

        $products = Product::query()
            ->whereIn('id', $productIds)
            ->get(['id', 'name', 'product_code', 'created_at', 'updated_at']);

        $stockMap = StockService::getStockMap($productIds);

        $result = [];
        foreach ($products as $product) {
            $key = (string) $product->id;
            if ($stockKey === 'barcode' && !empty($product->product_code)) {
                $key = (string) $product->product_code;
            } elseif ($stockKey === 'name' && !empty($product->name)) {
                $key = (string) $product->name;
            }

            if (array_key_exists($key, $result)) {
                $key = $key . '#' . (string) $product->id;
            }

            $result[$key] = [
                'id' => (int) $product->id,
                'name' => $product->name,
                'product_code' => $product->product_code,
                'barcode' => $product->product_code,
                'created_at' => $product->created_at?->toIso8601String(),
                'create_at' => $product->created_at?->toIso8601String(),
                'updated_at' => $product->updated_at?->toIso8601String(),
                'quantity' => (float) ($stockMap[$product->id] ?? 0),
            ];
        }

        return $result;
    }

    private function normalizeEvents(array $data): array
    {
        $events = [];

        foreach (($data['movements'] ?? []) as $movement) {
            $events[] = [
                'type' => $movement['type'],
                'product_id' => (int) $movement['product_id'],
                'quantity' => (float) ($movement['quantity'] ?? ($movement['qty'] ?? 0)),
                'lot_id' => $movement['lot_id'] ?? null,
                'expiry_date' => $movement['expiry_date'] ?? null,
                'supplier_id' => $movement['supplier_id'] ?? null,
                'warranty' => $movement['warranty'] ?? null,
                'unit_price' => $movement['unit_price'] ?? null,
                'invoice_id' => $movement['invoice_id'] ?? null,
                'issued_at' => $movement['issued_at'] ?? null,
                'user_id' => $movement['user_id'] ?? null,
            ];
        }

        foreach (($data['stock_ins'] ?? []) as $item) {
            $events[] = [
                'type' => 'IN',
                'product_id' => (int) $item['product_id'],
                'quantity' => (float) ($item['quantity'] ?? ($item['qty'] ?? 0)),
                'lot_id' => $item['lot_id'] ?? null,
                'expiry_date' => $item['expiry_date'] ?? null,
                'supplier_id' => $item['supplier_id'] ?? null,
                'warranty' => $item['warranty'] ?? null,
            ];
        }

        foreach (($data['invoice_items'] ?? []) as $item) {
            $events[] = [
                'type' => 'OUT',
                'product_id' => (int) $item['product_id'],
                'quantity' => (float) ($item['quantity'] ?? ($item['qty'] ?? 0)),
                'unit_price' => $item['unit_price'] ?? null,
                'lot_id' => $item['lot_id'] ?? null,
                'invoice_id' => $item['invoice_id'] ?? null,
                'issued_at' => $item['issued_at'] ?? null,
                'user_id' => $item['user_id'] ?? null,
            ];
        }

        return $events;
    }

    private function applyStockIn(array $data): array
    {
        $productId = (int) ($data['product_id'] ?? 0);
        $quantity = (float) ($data['quantity'] ?? 0);
        if ($productId <= 0 || $quantity <= 0) {
            throw new \RuntimeException('Invalid IN movement: product_id and quantity are required.');
        }

        $product = Product::query()->lockForUpdate()->findOrFail($productId);

        $lotId = $data['lot_id'] ?? null;
        $lot = null;

        if ($lotId) {
            $lot = Lot::query()->lockForUpdate()->findOrFail($lotId);
            if ((int) $lot->product_id !== (int) $product->id) {
                throw new \RuntimeException('Lot does not match product.');
            }

            $lot->remaining_qty = (float) $lot->remaining_qty + $quantity;
            $lot->save();
        } elseif (!empty($data['expiry_date']) || !empty($data['supplier_id']) || !empty($data['warranty'])) {
            $lot = Lot::create([
                'product_id' => $product->id,
                'expiry_date' => $data['expiry_date'] ?? null,
                'supplier_id' => $data['supplier_id'] ?? null,
                'warranty' => $data['warranty'] ?? null,
                'remaining_qty' => $quantity,
            ]);
            $lotId = $lot->id;
        }

        $stockIn = StockIn::create([
            'product_id' => $product->id,
            'lot_id' => $lotId,
            'quantity' => $quantity,
        ]);

        return [
            'stock_in_id' => $stockIn->id,
            'lot_id' => $lotId,
        ];
    }

    private function applyStockOut(array $data): array
    {
        $productId = (int) ($data['product_id'] ?? 0);
        $quantity = (float) ($data['quantity'] ?? 0);
        if ($productId <= 0 || $quantity <= 0) {
            throw new \RuntimeException('Invalid OUT movement: product_id and quantity are required.');
        }

        $product = Product::query()->lockForUpdate()->findOrFail($productId);
        $currentStock = (float) StockService::getStock($product->id);
        if ($currentStock < $quantity) {
            throw new \RuntimeException('Insufficient stock.');
        }

        if (!empty($data['lot_id'])) {
            $lot = Lot::query()->lockForUpdate()->findOrFail($data['lot_id']);
            if ((int) $lot->product_id !== (int) $product->id) {
                throw new \RuntimeException('Lot does not match product.');
            }
            if ((float) $lot->remaining_qty < $quantity) {
                throw new \RuntimeException('Insufficient lot quantity.');
            }
            $lot->remaining_qty = (float) $lot->remaining_qty - $quantity;
            $lot->save();
        }

        $unitPrice = (float) ($data['unit_price'] ?? $product->sale_price ?? 0);

        $invoice = null;
        if (!empty($data['invoice_id'])) {
            $invoice = Invoice::query()->lockForUpdate()->findOrFail($data['invoice_id']);
        } else {
            $issuedAt = !empty($data['issued_at']) ? Carbon::parse($data['issued_at']) : now();
            $invoice = Invoice::create([
                'issued_at' => $issuedAt,
                'user_id' => $data['user_id'] ?? null,
                'total_amount' => 0,
            ]);
        }

        $invoiceItem = InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'product_id' => $product->id,
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
        ]);

        $invoice->total_amount = (float) $invoice->total_amount + ($quantity * $unitPrice);
        $invoice->save();

        return [
            'invoice_id' => $invoice->id,
            'invoice_item_id' => $invoiceItem->id,
        ];
    }
}

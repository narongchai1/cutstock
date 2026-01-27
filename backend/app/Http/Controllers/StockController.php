<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Lot;
use App\Models\Product;
use App\Models\StockIn;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockController extends Controller
{
    public function stockIn(Request $request)
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'quantity' => ['required', 'numeric', 'min:0.01'],
            'lot_id' => ['nullable', 'integer', 'exists:lots,id'],
            'expiry_date' => ['nullable', 'date'],
            'supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'warranty' => ['nullable', 'string', 'max:255'],
        ]);

        return DB::transaction(function () use ($data) {
            $product = Product::query()->lockForUpdate()->findOrFail($data['product_id']);

            $lotId = $data['lot_id'] ?? null;
            $lot = null;

            if ($lotId) {
                $lot = Lot::query()->lockForUpdate()->findOrFail($lotId);
                if ($lot->product_id !== $product->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Lot does not match product.',
                    ], 422);
                }

                $lot->remaining_qty = (float) $lot->remaining_qty + (float) $data['quantity'];
                $lot->save();
            } elseif (!empty($data['expiry_date']) || !empty($data['supplier_id']) || !empty($data['warranty'])) {
                $lot = Lot::create([
                    'product_id' => $product->id,
                    'expiry_date' => $data['expiry_date'] ?? null,
                    'supplier_id' => $data['supplier_id'] ?? null,
                    'warranty' => $data['warranty'] ?? null,
                    'remaining_qty' => (float) $data['quantity'],
                ]);
                $lotId = $lot->id;
            }

            $stockIn = StockIn::create([
                'product_id' => $product->id,
                'lot_id' => $lotId,
                'quantity' => (float) $data['quantity'],
            ]);

            $product->setAttribute('stock', (float) StockService::getStock($product->id));

            return response()->json([
                'success' => true,
                'product' => $product,
                'stock_in' => $stockIn,
                'lot' => $lot,
            ]);
        });
    }

    public function stockOut(Request $request)
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'quantity' => ['required', 'numeric', 'min:0.01'],
            'unit_price' => ['nullable', 'numeric', 'min:0'],
            'lot_id' => ['nullable', 'integer', 'exists:lots,id'],
            'invoice_id' => ['nullable', 'integer', 'exists:invoices,id'],
            'issued_at' => ['nullable', 'date'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        return DB::transaction(function () use ($data) {
            $product = Product::query()->lockForUpdate()->findOrFail($data['product_id']);
            $currentStock = (float) StockService::getStock($product->id);

            if ($currentStock < (float) $data['quantity']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient stock.',
                ], 422);
            }

            if (!empty($data['lot_id'])) {
                $lot = Lot::query()->lockForUpdate()->findOrFail($data['lot_id']);
                if ($lot->product_id !== $product->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Lot does not match product.',
                    ], 422);
                }

                if ((float) $lot->remaining_qty < (float) $data['quantity']) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Insufficient lot quantity.',
                    ], 422);
                }

                $lot->remaining_qty = (float) $lot->remaining_qty - (float) $data['quantity'];
                $lot->save();
            }

            $unitPrice = (float) ($data['unit_price'] ?? $product->sale_price ?? 0);

            $invoice = null;
            if (!empty($data['invoice_id'])) {
                $invoice = Invoice::query()->lockForUpdate()->findOrFail($data['invoice_id']);
            } else {
                $invoice = Invoice::create([
                    'issued_at' => $data['issued_at'] ?? now(),
                    'user_id' => $data['user_id'] ?? null,
                    'total_amount' => 0,
                ]);
            }

            $invoiceItem = InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'product_id' => $product->id,
                'quantity' => (float) $data['quantity'],
                'unit_price' => $unitPrice,
            ]);

            $lineTotal = (float) $data['quantity'] * $unitPrice;
            $invoice->total_amount = (float) $invoice->total_amount + $lineTotal;
            $invoice->save();

            $product->setAttribute('stock', (float) StockService::getStock($product->id));

            return response()->json([
                'success' => true,
                'product' => $product,
                'invoice' => $invoice,
                'invoice_item' => $invoiceItem,
            ]);
        });
    }
}

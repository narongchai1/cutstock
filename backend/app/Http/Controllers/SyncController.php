<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Product;
use App\Models\StockIn;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SyncController extends Controller
{
    public function sync(Request $request)
    {
        return DB::transaction(function () use ($request) {
            $stockInCount = 0;
            $stockOutCount = 0;

            if ($request->has('movements')) {
                foreach ($request->input('movements', []) as $movement) {
                    if (($movement['type'] ?? '') === 'IN') {
                        $this->createStockIn($movement);
                        $stockInCount++;
                    } elseif (($movement['type'] ?? '') === 'OUT') {
                        $this->createInvoiceItem($movement);
                        $stockOutCount++;
                    }
                }
            }

            foreach ($request->input('stock_ins', []) as $item) {
                $this->createStockIn($item);
                $stockInCount++;
            }

            foreach ($request->input('invoice_items', []) as $item) {
                $this->createInvoiceItem($item);
                $stockOutCount++;
            }

            return response()->json([
                'status' => 'ok',
                'stock_ins' => $stockInCount,
                'stock_outs' => $stockOutCount,
            ]);
        });
    }

    private function createStockIn(array $data): void
    {
        $productId = $data['product_id'] ?? null;
        $quantity = $data['quantity'] ?? ($data['qty'] ?? null);

        if (!$productId || !$quantity) {
            return;
        }

        if (!Product::query()->whereKey($productId)->exists()) {
            return;
        }

        StockIn::create([
            'product_id' => $productId,
            'lot_id' => $data['lot_id'] ?? null,
            'quantity' => (float) $quantity,
        ]);
    }

    private function createInvoiceItem(array $data): void
    {
        $productId = $data['product_id'] ?? null;
        $quantity = $data['quantity'] ?? ($data['qty'] ?? null);
        $unitPrice = $data['unit_price'] ?? 0;

        if (!$productId || !$quantity) {
            return;
        }

        if (!Product::query()->whereKey($productId)->exists()) {
            return;
        }

        $invoice = null;
        if (!empty($data['invoice_id'])) {
            $invoice = Invoice::query()->find($data['invoice_id']);
        }

        if (!$invoice) {
            $invoice = Invoice::create([
                'issued_at' => $data['issued_at'] ?? now(),
                'user_id' => $data['user_id'] ?? null,
                'total_amount' => 0,
            ]);
        }

        InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'product_id' => $productId,
            'quantity' => (float) $quantity,
            'unit_price' => (float) $unitPrice,
        ]);

        $invoice->total_amount = (float) $invoice->total_amount + ((float) $quantity * (float) $unitPrice);
        $invoice->save();
    }
}

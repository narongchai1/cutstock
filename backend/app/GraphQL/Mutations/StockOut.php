<?php

namespace App\GraphQL\Mutations;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Lot;
use App\Models\Product;
use App\Services\StockService;
use Illuminate\Support\Facades\DB;

class StockOut
{
    public function __invoke($_, array $args): array
    {
        $productId = $args['product_id'] ?? null;
        $quantity = (float) ($args['quantity'] ?? 0);

        if (!$productId || $quantity <= 0) {
            return ['success' => false];
        }

        return DB::transaction(function () use ($args, $productId, $quantity) {
            $product = Product::query()->lockForUpdate()->find($productId);
            if (!$product) {
                return ['success' => false];
            }

            $currentStock = (float) StockService::getStock($product->id);
            if ($currentStock < $quantity) {
                return ['success' => false];
            }

            if (!empty($args['lot_id'])) {
                $lot = Lot::query()->lockForUpdate()->find($args['lot_id']);
                if (!$lot || $lot->product_id !== $product->id) {
                    return ['success' => false];
                }

                if ((float) $lot->remaining_qty < $quantity) {
                    return ['success' => false];
                }

                $lot->remaining_qty = (float) $lot->remaining_qty - $quantity;
                $lot->save();
            }

            $unitPrice = (float) ($args['unit_price'] ?? $product->sale_price ?? 0);

            $invoice = null;
            if (!empty($args['invoice_id'])) {
                $invoice = Invoice::query()->lockForUpdate()->find($args['invoice_id']);
            }

            if (!$invoice) {
                $invoice = Invoice::create([
                    'issued_at' => $args['issued_at'] ?? now(),
                    'user_id' => $args['user_id'] ?? null,
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

            $product->setAttribute('stock', (float) StockService::getStock($product->id));

            return [
                'success' => true,
                'product' => $product,
                'invoice' => $invoice,
                'invoice_item' => $invoiceItem,
            ];
        });
    }
}

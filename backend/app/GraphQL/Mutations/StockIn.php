<?php

namespace App\GraphQL\Mutations;

use App\Models\Lot;
use App\Models\Product;
use App\Models\StockIn as StockInModel;
use App\Services\StockService;
use Illuminate\Support\Facades\DB;

class StockIn
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

            $lotId = $args['lot_id'] ?? null;
            $lot = null;

            if ($lotId) {
                $lot = Lot::query()->lockForUpdate()->find($lotId);
                if (!$lot || $lot->product_id !== $product->id) {
                    return ['success' => false];
                }

                $lot->remaining_qty = (float) $lot->remaining_qty + $quantity;
                $lot->save();
            } elseif (!empty($args['expiry_date']) || !empty($args['supplier_id']) || !empty($args['warranty'])) {
                $lot = Lot::create([
                    'product_id' => $product->id,
                    'expiry_date' => $args['expiry_date'] ?? null,
                    'supplier_id' => $args['supplier_id'] ?? null,
                    'warranty' => $args['warranty'] ?? null,
                    'remaining_qty' => $quantity,
                ]);
                $lotId = $lot->id;
            }

            $stockIn = StockInModel::create([
                'product_id' => $product->id,
                'lot_id' => $lotId,
                'quantity' => $quantity,
            ]);

            $product->setAttribute('stock', (float) StockService::getStock($product->id));

            return [
                'success' => true,
                'product' => $product,
                'stock_in' => $stockIn,
                'lot' => $lot,
            ];
        });
    }
}

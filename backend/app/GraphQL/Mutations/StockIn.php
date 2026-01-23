<?php

namespace App\GraphQL\Mutations;

use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StockIn
{
    public function __invoke($_, array $args): array
    {
        $productId = $args['product_id'] ?? null;
        $qty = (int) ($args['qty'] ?? 0);

        if (!$productId || $qty < 1) {
            return ['success' => false];
        }

        return DB::transaction(function () use ($args, $productId, $qty) {
            $product = Product::query()->lockForUpdate()->find($productId);
            if (!$product) {
                return ['success' => false];
            }

            $currentStock = (int) ($product->stock ?? 0);
            $newStock = $currentStock + $qty;

            if (!empty($args['lot_id'])) {
                $lot = DB::table('lots')
                    ->where('id', $args['lot_id'])
                    ->lockForUpdate()
                    ->first();

                if (!$lot || $lot->product_id !== $product->id) {
                    return ['success' => false];
                }

                $currentLotQty = (float) ($lot->remaining_qty ?? 0);
                DB::table('lots')
                    ->where('id', $args['lot_id'])
                    ->update(['remaining_qty' => $currentLotQty + $qty]);
            }

            $product->stock = $newStock;
            $product->last_stock_added = $qty;
            $product->last_stock_added_at = now()->toDateString();
            $product->save();

            $movement = StockMovement::create([
                'id' => (string) Str::uuid(),
                'product_id' => $product->id,
                'lot_id' => $args['lot_id'] ?? null,
                'type' => 'IN',
                'qty' => $qty,
                'device_id' => $args['device_id'] ?? null,
            ]);

            return [
                'success' => true,
                'product' => $product,
                'movement' => $movement,
            ];
        });
    }
}

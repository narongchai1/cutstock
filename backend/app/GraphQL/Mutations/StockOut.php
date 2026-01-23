<?php

namespace App\GraphQL\Mutations;

use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StockOut
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
            $newStock = $currentStock - $qty;

            if ($newStock < 0) {
                return ['success' => false];
            }

            if (!empty($args['lot_id'])) {
                $lot = DB::table('lots')
                    ->where('id', $args['lot_id'])
                    ->lockForUpdate()
                    ->first();

                if (!$lot || $lot->product_id !== $product->id) {
                    return ['success' => false];
                }

                $currentLotQty = (float) ($lot->remaining_qty ?? 0);
                $newLotQty = $currentLotQty - $qty;
                if ($newLotQty < 0) {
                    return ['success' => false];
                }

                DB::table('lots')
                    ->where('id', $args['lot_id'])
                    ->update(['remaining_qty' => $newLotQty]);
            }

            $product->stock = $newStock;
            $product->save();

            $movement = StockMovement::create([
                'id' => (string) Str::uuid(),
                'product_id' => $product->id,
                'lot_id' => $args['lot_id'] ?? null,
                'type' => 'OUT',
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

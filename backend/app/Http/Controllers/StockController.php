<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StockController extends Controller
{
    public function stockIn(Request $request)
    {
        return $this->recordMovement($request, 'IN');
    }

    public function stockOut(Request $request)
    {
        return $this->recordMovement($request, 'OUT');
    }

    private function recordMovement(Request $request, string $type)
    {
        $data = $request->validate([
            'product_id' => ['required', 'string', 'max:64', 'exists:products,id'],
            'qty' => ['required', 'integer', 'min:1'],
            'device_id' => ['nullable', 'string', 'max:255'],
            'lot_id' => ['nullable', 'integer', 'exists:lots,id'],
        ]);

        return DB::transaction(function () use ($data, $type) {
            $product = Product::query()->lockForUpdate()->findOrFail($data['product_id']);

            $currentStock = (int) ($product->stock ?? 0);
            $qty = (int) $data['qty'];
            $newStock = $type === 'IN' ? $currentStock + $qty : $currentStock - $qty;

            if ($newStock < 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient stock.',
                ], 422);
            }

            if (!empty($data['lot_id'])) {
                $lot = DB::table('lots')
                    ->where('id', $data['lot_id'])
                    ->lockForUpdate()
                    ->first();

                if (!$lot || $lot->product_id !== $product->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Lot does not match the product.',
                    ], 422);
                }

                $currentLotQty = (float) ($lot->remaining_qty ?? 0);
                $newLotQty = $type === 'IN' ? $currentLotQty + $qty : $currentLotQty - $qty;

                if ($newLotQty < 0) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Insufficient lot quantity.',
                    ], 422);
                }

                DB::table('lots')
                    ->where('id', $data['lot_id'])
                    ->update(['remaining_qty' => $newLotQty]);
            }

            $product->stock = $newStock;
            if ($type === 'IN') {
                $product->last_stock_added = $qty;
                $product->last_stock_added_at = now()->toDateString();
            }
            $product->save();

            $movement = StockMovement::create([
                'id' => (string) Str::uuid(),
                'product_id' => $product->id,
                'lot_id' => $data['lot_id'] ?? null,
                'type' => $type,
                'qty' => $qty,
                'device_id' => $data['device_id'] ?? null,
            ]);

            return response()->json([
                'success' => true,
                'product' => $product,
                'movement' => $movement,
            ]);
        });
    }
}

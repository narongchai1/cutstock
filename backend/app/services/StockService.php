<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class StockService
{
    public static function getStock(int $productId): float
    {
        $stockIn = (float) (DB::table('stock_ins')
            ->where('product_id', $productId)
            ->sum('quantity') ?? 0);

        $stockOut = (float) (DB::table('invoice_items')
            ->where('product_id', $productId)
            ->sum('quantity') ?? 0);

        return $stockIn - $stockOut;
    }

    public static function getStockMap(array $productIds): array
    {
        if (empty($productIds)) {
            return [];
        }

        $stockIns = DB::table('stock_ins')
            ->select('product_id', DB::raw('SUM(quantity) as qty'))
            ->whereIn('product_id', $productIds)
            ->groupBy('product_id')
            ->pluck('qty', 'product_id')
            ->all();

        $stockOuts = DB::table('invoice_items')
            ->select('product_id', DB::raw('SUM(quantity) as qty'))
            ->whereIn('product_id', $productIds)
            ->groupBy('product_id')
            ->pluck('qty', 'product_id')
            ->all();

        $stockMap = [];
        foreach ($productIds as $productId) {
            $stockMap[$productId] = (float) ($stockIns[$productId] ?? 0)
                - (float) ($stockOuts[$productId] ?? 0);
        }

        return $stockMap;
    }
}

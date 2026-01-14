<?php

namespace App\Services;

use App\Models\StockMovement;

class StockService
{
    public static function getStock(string $productId): int
    {
        return StockMovement::where('product_id', $productId)
            ->selectRaw("
                COALESCE(SUM(CASE WHEN type='IN' THEN qty ELSE 0 END), 0)
              - COALESCE(SUM(CASE WHEN type='OUT' THEN qty ELSE 0 END), 0)
              + COALESCE(SUM(CASE WHEN type='ADJUST' THEN qty ELSE 0 END), 0)
              AS stock
            ")
            ->value('stock') ?? 0;
    }
}

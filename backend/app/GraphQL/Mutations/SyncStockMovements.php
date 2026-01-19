<?php

namespace App\GraphQL\Mutations;

use App\Models\StockMovement;
use Illuminate\Support\Carbon;

class SyncStockMovements
{
    public function __invoke($_, array $args): bool
    {
        $items = $args['items'] ?? [];

        if (empty($items)) {
            return true;
        }

        foreach ($items as $movement) {
            $createdAt = $movement['created_at'] ?? null;

            StockMovement::updateOrCreate(
                ['id' => $movement['id']],
                [
                    'product_id' => $movement['product_id'],
                    'type' => $movement['type'],
                    'qty' => $movement['qty'],
                    'device_id' => $movement['device_id'] ?? null,
                    'created_at' => $createdAt ? Carbon::parse($createdAt) : now(),
                    'synced_at' => now(),
                ]
            );
        }

    }
}

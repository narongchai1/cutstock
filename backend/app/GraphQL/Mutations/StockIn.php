<?php

namespace App\GraphQL\Mutations;

use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Support\Str;

class StockIn
{
    public function __invoke($_, array $args): bool
    {
        StockMovement::create([
            'id' => Str::uuid(),
            'product_id' => $args['product_id'],
            'type' => 'IN',
            'qty' => $args['qty'],
            'device_id' => $args['device_id'] ?? 'UNKNOWN',
        ]);

        Product::where('id', $args['product_id'])->update([
            'last_stock_added' => $args['qty'],
            'last_stock_added_at' => now()->toDateString(),
        ]);

        return true;
    }
}

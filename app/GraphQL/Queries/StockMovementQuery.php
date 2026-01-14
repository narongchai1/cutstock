<?php

namespace App\GraphQL\Queries;

use App\Models\StockMovement;

class StockMovementQuery
{
    public function byProduct($_, array $args)
    {
        return StockMovement::where('product_id', $args['product_id'])
            ->orderBy('created_at', 'desc')
            ->get();
    }
}

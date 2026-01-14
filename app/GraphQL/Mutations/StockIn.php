<?php

namespace App\GraphQL\Mutations;

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


        return true;
    }
}

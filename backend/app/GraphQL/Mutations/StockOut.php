<?php

namespace App\GraphQL\Mutations;

use App\Models\StockMovement;
use App\Services\StockService;
use Illuminate\Support\Str;

class StockOut
{
    public function __invoke($_, array $args): bool
    {
        $currentStock = StockService::getStock($args['product_id']);

        if ($currentStock < $args['qty']) {
            return false;
        }

      StockMovement::create([
    'id' => Str::uuid(),
    'product_id' => $args['product_id'],
    'type' => 'OUT',
    'qty' => $args['qty'],
    'device_id' => $args['device_id'] ?? 'UNKNOWN',
]);


        return true;
    }
}

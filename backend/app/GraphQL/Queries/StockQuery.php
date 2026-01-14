<?php

namespace App\GraphQL\Queries;

use App\Services\StockService;

class StockQuery
{
    public function __invoke($_, array $args): int
    {
        return StockService::getStock($args['product_id']);
    }
}

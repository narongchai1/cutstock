<?php

namespace App\GraphQL\Mutations;

use App\Models\Product;
use App\Models\StockIn;
use App\Services\StockService;

class CreateProduct
{
    public function __invoke($_, array $args)
    {
        $product = Product::create([
            'product_code' => $args['product_code'],
            'name' => $args['name'],
            'category_id' => $args['category_id'] ?? null,
            'unit_id' => $args['unit_id'] ?? null,
            'sale_unit_id' => $args['sale_unit_id'] ?? null,
            'standard_cost' => $args['standard_cost'] ?? 0,
            'sale_price' => $args['sale_price'] ?? 0,
        ]);

        $initialStock = $args['initial_stock'] ?? null;
        if ($initialStock !== null && (float) $initialStock > 0) {
            StockIn::create([
                'product_id' => $product->id,
                'quantity' => (float) $initialStock,
            ]);
        }

        $product->setAttribute('stock', (float) StockService::getStock($product->id));

        return $product;
    }
}

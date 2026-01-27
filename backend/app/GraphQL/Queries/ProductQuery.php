<?php

namespace App\GraphQL\Queries;

use App\Models\Product;
use App\Services\StockService;

class ProductQuery
{
    public function products()
    {
        $products = Product::all();
        $stockMap = StockService::getStockMap($products->pluck('id')->all());

        return $products->map(function (Product $product) use ($stockMap) {
            $product->setAttribute('stock', (float) ($stockMap[$product->id] ?? 0));
            return $product;
        });
    }
}

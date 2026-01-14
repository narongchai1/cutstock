<?php

namespace App\GraphQL\Queries;

use App\Models\Product;
use App\Models\StockMovement;

class ProductQuery
{
    public function products()
    {
        return Product::all()->map(function ($product) {

            $stockIn = StockMovement::where('product_id', $product->id)
                ->where('type', 'IN')
                ->sum('qty');

            $stockOut = StockMovement::where('product_id', $product->id)
                ->where('type', 'OUT')
                ->sum('qty');

            $product->stock = $stockIn - $stockOut;

            return $product;
        });
    }
}

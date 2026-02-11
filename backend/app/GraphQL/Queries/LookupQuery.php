<?php

namespace App\GraphQL\Queries;

use App\Models\Category;
use App\Models\InvoiceItem;
use App\Models\Lot;
use App\Models\StockIn;
use App\Models\Supplier;
use App\Models\Unit;

class LookupQuery
{
    public function categories()
    {
        return Category::orderBy('name')->get();
    }

    public function units()
    {
        return Unit::orderBy('name')->get();
    }

    public function suppliers()
    {
        return Supplier::orderBy('name')->get();
    }

    public function lots($_, array $args)
    {
        $query = Lot::query()->orderByDesc('created_at');
        if (!empty($args['product_id'])) {
            $query->where('product_id', $args['product_id']);
        }

        return $query->get();
    }

    public function stockIns($_, array $args)
    {
        return StockIn::where('product_id', $args['product_id'])
            ->orderByDesc('created_at')
            ->get();
    }

    public function invoiceItems($_, array $args)
    {
        return InvoiceItem::where('product_id', $args['product_id'])
            ->orderByDesc('created_at')
            ->get();
    }
}

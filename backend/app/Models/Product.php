<?php

namespace App\Models;

use App\Services\StockService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_code',
        'name',
        'category_id',
        'unit_id',
        'sale_unit_id',
        'standard_cost',
        'sale_price',
    ];

    protected $casts = [
        'category_id' => 'integer',
        'unit_id' => 'integer',
        'sale_unit_id' => 'integer',
        'standard_cost' => 'float',
        'sale_price' => 'float',
    ];

    protected $appends = [
        'stock',
    ];

    public function getStockAttribute(): float
    {
        return (float) StockService::getStock($this->id);
    }
}

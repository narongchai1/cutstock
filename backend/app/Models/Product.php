<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'barcode',
        'name',
        'price',
        'cost',
        'cost_price',
        'stock',
        'unit',
        'size',
        'category',
        'subcategory',
        'main_category',
        'sub_category',
        'status',
        'last_stock_added',
        'last_stock_added_at',
        'expiry_date',
        'warranty_expiry_date',
        'storage_location',
        'sale_location',
    ];

    protected $casts = [
        'price' => 'float',
        'cost' => 'float',
        'cost_price' => 'float',
        'stock' => 'integer',
        'last_stock_added' => 'integer',
        'last_stock_added_at' => 'date',
        'expiry_date' => 'date',
        'warranty_expiry_date' => 'date',
    ];
}

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
        'category',
        'subcategory',
        'main_category',
        'sub_category',
        'status',
    ];

    protected $casts = [
        'price' => 'float',
        'cost' => 'float',
        'cost_price' => 'float',
        'stock' => 'integer',
    ];
}

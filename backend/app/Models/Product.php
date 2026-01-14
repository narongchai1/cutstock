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
        'stock',
        'category',
        'subcategory',
        'status',
    ];

    protected $casts = [
        'price' => 'float',
        'cost' => 'float',
        'stock' => 'integer',
    ];
}

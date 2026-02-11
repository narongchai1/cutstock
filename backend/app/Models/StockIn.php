<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockIn extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'lot_id',
        'quantity',
    ];

    protected $casts = [
        'product_id' => 'integer',
        'lot_id' => 'integer',
        'quantity' => 'float',
    ];
}

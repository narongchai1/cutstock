<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Lot extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'expiry_date',
        'remaining_qty',
        'supplier_id',
        'warranty',
    ];

    protected $casts = [
        'product_id' => 'integer',
        'supplier_id' => 'integer',
        'expiry_date' => 'date',
        'remaining_qty' => 'float',
    ];
}

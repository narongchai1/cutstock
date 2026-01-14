<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    use HasFactory;

    protected $fillable = [
        'id',
        'product_id',
        'type',
        'qty',
        'device_id',
        'synced_at ',
    ];

    public $incrementing = false;

    protected $keyType = 'string';
}

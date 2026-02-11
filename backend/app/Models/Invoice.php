<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'issued_at',
        'user_id',
        'total_amount',
    ];

    protected $casts = [
        'issued_at' => 'datetime',
        'user_id' => 'integer',
        'total_amount' => 'float',
    ];
}

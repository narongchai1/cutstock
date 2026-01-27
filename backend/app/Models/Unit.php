<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Unit extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'base_unit_id',
        'conversion_rate',
        'is_base_unit',
    ];

    protected $casts = [
        'base_unit_id' => 'integer',
        'conversion_rate' => 'float',
        'is_base_unit' => 'boolean',
    ];
}

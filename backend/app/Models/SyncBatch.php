<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SyncBatch extends Model
{
    protected $fillable = [
        'sync_id',
        'user_id',
        'device_id',
        'status',
        'request_json',
        'response_json',
        'error',
    ];

    protected $casts = [
        'request_json' => 'array',
        'response_json' => 'array',
    ];
}


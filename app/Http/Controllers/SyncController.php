<?php

namespace App\Http\Controllers;

use App\Models\StockMovement;
use Illuminate\Http\Request;

class SyncController extends Controller
{
    public function sync(Request $request)
    {
        foreach ($request->movements as $movement) {
            StockMovement::updateOrCreate(
                ['id' => $movement['id']],
                [
                    'product_id' => $movement['product_id'],
                    'type' => $movement['type'],
                    'qty' => $movement['qty'],
                    'device_id' => $movement['device_id'],
                    'created_at' => $movement['created_at'],
                    'synced_at' => now(),
                ]
            );
        }

        return response()->json(['status' => 'ok']);
    }
}

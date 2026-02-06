<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PresenceController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\SyncController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/dashboard', [DashboardController::class, 'summary']);
    Route::get('/dashboard/sales-summary', [DashboardController::class, 'salesSummary']);
    Route::get('/dashboard/stock-summary', [DashboardController::class, 'stockSummary']);
    Route::get('/dashboard/low-stock', [DashboardController::class, 'lowStock']);
    Route::get('/dashboard/near-expire', [DashboardController::class, 'nearExpire']);
    Route::get('/dashboard/system-status', [DashboardController::class, 'systemStatus']);

    Route::post('/stock-in', [StockController::class, 'stockIn']);
    Route::post('/stock-out', [StockController::class, 'stockOut']);

    Route::get('/products', [ProductController::class, 'index']);
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{product}', [ProductController::class, 'update']);
    Route::delete('/products/{product}', [ProductController::class, 'destroy']);

    Route::get('/categories', [ProductController::class, 'categories']);

    Route::get('/suppliers', [SupplierController::class, 'index']);
    Route::post('/suppliers', [SupplierController::class, 'store']);
    Route::put('/suppliers/{supplier}', [SupplierController::class, 'update']);
    Route::delete('/suppliers/{supplier}', [SupplierController::class, 'destroy']);

    Route::post('/sync', [SyncController::class, 'sync']);

    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::post('/presence/heartbeat', [PresenceController::class, 'heartbeat']);
    Route::get('/presence/{user}', [PresenceController::class, 'status']);
});

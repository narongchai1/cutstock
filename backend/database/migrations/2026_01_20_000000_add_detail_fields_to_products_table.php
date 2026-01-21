<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('size')->nullable();
            $table->integer('last_stock_added')->nullable();
            $table->date('last_stock_added_at')->nullable();
            $table->date('expiry_date')->nullable();
            $table->date('warranty_expiry_date')->nullable();
            $table->string('storage_location')->nullable();
            $table->string('sale_location')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'size',
                'last_stock_added',
                'last_stock_added_at',
                'expiry_date',
                'warranty_expiry_date',
                'storage_location',
                'sale_location',
            ]);
        });
    }
};

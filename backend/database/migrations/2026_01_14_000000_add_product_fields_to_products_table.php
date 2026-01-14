<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('barcode')->nullable();
            $table->float('cost')->default(0);
            $table->integer('stock')->default(0);
            $table->string('category')->nullable();
            $table->string('subcategory')->nullable();
            $table->string('status')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'barcode',
                'cost',
                'stock',
                'category',
                'subcategory',
                'status',
            ]);
        });
    }
};

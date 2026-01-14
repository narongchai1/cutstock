<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
       Schema::create('stock_movements', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('product_id');
    $table->enum('type', ['IN', 'OUT', 'ADJUST']);
    $table->integer('qty');
    $table->string('device_id')->nullable();
    $table->timestamps();
});

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};

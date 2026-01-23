<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_receipt_id')
                ->constrained('sale_receipts')
                ->cascadeOnDelete();
            $table->string('product_id', 64);
            $table->foreignId('unit_id')->nullable()
                ->constrained('units')
                ->nullOnDelete();
            $table->decimal('quantity', 12, 2)->default(0);
            $table->decimal('sub_unit_quantity', 12, 2)->default(0);
            $table->decimal('cost_per_unit', 12, 2)->default(0);
            $table->decimal('sale_price_per_unit', 12, 2)->default(0);
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_items');
    }
};

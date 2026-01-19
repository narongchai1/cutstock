<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('receipts', function (Blueprint $table) {
            $table->id();
            $table->string('sale_number')->nullable();
            $table->string('item_name')->nullable();
            $table->decimal('sale_price', 12, 2)->nullable();
            $table->integer('quantity')->default(0);
            $table->string('unit')->nullable();
            $table->foreignId('receipt_setting_id')->nullable()
                ->constrained('receipt_settings')
                ->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('receipts');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('parent_id')->nullable()
                ->constrained('categories')
                ->nullOnDelete();
            $table->timestamps();

            $table->unique(['parent_id', 'name']);
        });

        Schema::create('units', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('base_unit_id')->nullable()
                ->constrained('units')
                ->nullOnDelete();
            $table->decimal('conversion_rate', 12, 4)->nullable();
            $table->boolean('is_base_unit')->default(false);
            $table->timestamps();

            $table->unique(['base_unit_id', 'name']);
        });

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('username')->unique();
            $table->string('password');
            $table->string('role')->nullable();
            $table->timestamps();
        });

        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('contact_info')->nullable();
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('product_code')->unique();
            $table->string('name');
            $table->foreignId('category_id')->nullable()
                ->constrained('categories')
                ->nullOnDelete();
            $table->foreignId('unit_id')->nullable()
                ->constrained('units')
                ->nullOnDelete();
            $table->foreignId('sale_unit_id')->nullable()
                ->constrained('units')
                ->nullOnDelete();
            $table->decimal('standard_cost', 12, 2)->default(0);
            $table->decimal('sale_price', 12, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('lots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')
                ->constrained('products')
                ->cascadeOnDelete();
            $table->date('expiry_date')->nullable();
            $table->decimal('remaining_qty', 12, 2)->default(0);
            $table->foreignId('supplier_id')->nullable()
                ->constrained('suppliers')
                ->nullOnDelete();
            $table->string('warranty')->nullable();
            $table->timestamps();

            $table->index(['product_id', 'expiry_date']);
        });

        Schema::create('stock_ins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lot_id')->nullable()
                ->constrained('lots')
                ->nullOnDelete();
            $table->foreignId('product_id')
                ->constrained('products')
                ->cascadeOnDelete();
            $table->decimal('quantity', 12, 2)->default(0);
            $table->timestamps();

            $table->index(['product_id', 'lot_id']);
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->date('issued_at')->nullable();
            $table->foreignId('user_id')->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')
                ->constrained('invoices')
                ->cascadeOnDelete();
            $table->foreignId('product_id')
                ->constrained('products')
                ->cascadeOnDelete();
            $table->decimal('quantity', 12, 2)->default(0);
            $table->decimal('unit_price', 12, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('stock_ins');
        Schema::dropIfExists('lots');
        Schema::dropIfExists('products');
        Schema::dropIfExists('suppliers');
        Schema::dropIfExists('users');
        Schema::dropIfExists('units');
        Schema::dropIfExists('categories');
    }
};

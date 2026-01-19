<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('unit')->nullable();
            $table->decimal('cost_price', 12, 2)->nullable();
            $table->string('main_category')->nullable();
            $table->string('sub_category')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'unit',
                'cost_price',
                'main_category',
                'sub_category',
            ]);
        });
    }
};

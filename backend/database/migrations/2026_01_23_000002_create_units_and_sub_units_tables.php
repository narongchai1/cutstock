<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('units', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::create('sub_units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_id')->constrained('units')->cascadeOnDelete();
            $table->string('name');
            $table->string('measurement_unit')->nullable();
            $table->decimal('conversion_factor', 12, 3)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('units', function (Blueprint $table) {
            $table->foreignId('default_sub_unit_id')->nullable()
                ->constrained('sub_units')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('units', function (Blueprint $table) {
            $table->dropForeign(['default_sub_unit_id']);
            $table->dropColumn('default_sub_unit_id');
        });

        Schema::dropIfExists('sub_units');
        Schema::dropIfExists('units');
    }
};

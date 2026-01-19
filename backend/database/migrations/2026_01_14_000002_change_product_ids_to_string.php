<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE products ALTER COLUMN id TYPE varchar(64) USING id::text');
        DB::statement('ALTER TABLE stock_movements ALTER COLUMN id TYPE varchar(64) USING id::text');
        DB::statement('ALTER TABLE stock_movements ALTER COLUMN product_id TYPE varchar(64) USING product_id::text');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE stock_movements ALTER COLUMN product_id TYPE uuid USING product_id::uuid');
        DB::statement('ALTER TABLE stock_movements ALTER COLUMN id TYPE uuid USING id::uuid');
        DB::statement('ALTER TABLE products ALTER COLUMN id TYPE uuid USING id::uuid');
    }
};

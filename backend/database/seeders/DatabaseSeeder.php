<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(AdminUserSeeder::class);

        User::updateOrCreate(
            ['username' => 'staff'],
            [
                'name' => 'พนักงาน',
                'email' => 'staff@example.com',
                'password' => Hash::make('staff123'),
                'role' => 'staff',
            ]
        );
    }
}

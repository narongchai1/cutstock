<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'name' => 'User One',
                'username' => 'user1',
                'email' => 'user1@example.com',
                'role' => 'staff',
                'phone_number' => '0800000001',
                'status' => 'active',
                'password' => Hash::make('user123'),
            ],
            [
                'name' => 'User Two',
                'username' => 'user2',
                'email' => 'user2@example.com',
                'role' => 'staff',
                'phone_number' => '0800000002',
                'status' => 'active',
                'password' => Hash::make('user123'),
            ],
            [
                'name' => 'User Three',
                'username' => 'user3',
                'email' => 'user3@example.com',
                'role' => 'staff',
                'phone_number' => '0800000003',
                'status' => 'inactive',
                'password' => Hash::make('user123'),
            ],
        ];

        foreach ($users as $user) {
            User::updateOrCreate(
                ['username' => $user['username']],
                $user
            );
        }
    }
}

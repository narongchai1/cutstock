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
                'username' => 'user1',
                'role' => 'staff',
                'password' => Hash::make('user123'),
            ],
            [
                'username' => 'user2',
                'role' => 'staff',
                'password' => Hash::make('user123'),
            ],
            [
                'username' => 'user3',
                'role' => 'staff',
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

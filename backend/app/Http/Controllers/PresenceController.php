<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Redis;

class PresenceController extends Controller
{
    private const HEARTBEAT_TTL_SECONDS = 10;

    public function heartbeat(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized.',
            ], 401);
        }

        $timestamp = now()->timestamp;
        Redis::setex($this->presenceKey($user->id), self::HEARTBEAT_TTL_SECONDS, (string) $timestamp);

        return response()->json([
            'status' => 'ok',
            'user_id' => $user->id,
            'online' => true,
            'last_seen_at' => now()->toIso8601String(),
            'ttl_seconds' => self::HEARTBEAT_TTL_SECONDS,
        ]);
    }

    public function status(User $user)
    {
        $value = Redis::get($this->presenceKey($user->id));
        if (!$value) {
            return response()->json([
                'status' => 'ok',
                'user_id' => $user->id,
                'online' => false,
                'last_seen_at' => null,
            ]);
        }

        $lastSeen = Carbon::createFromTimestamp((int) $value);

        return response()->json([
            'status' => 'ok',
            'user_id' => $user->id,
            'online' => true,
            'last_seen_at' => $lastSeen->toIso8601String(),
        ]);
    }

    private function presenceKey(int $userId): string
    {
        return 'presence:user:' . $userId;
    }
}

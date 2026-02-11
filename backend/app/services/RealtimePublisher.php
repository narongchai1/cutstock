<?php

namespace App\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RealtimePublisher
{
    public function stockChanged(array $productIds, array $meta = []): void
    {
        $productIds = array_values(array_unique(array_filter(array_map(fn ($id) => (int) $id, $productIds), fn ($id) => $id > 0)));
        if (empty($productIds)) {
            return;
        }

        $this->publish('stock.changed', [
            'product_ids' => $productIds,
            'at' => Carbon::now()->toIso8601String(),
            'meta' => (object) $meta,
        ]);
    }

    private function publish(string $event, array $data): void
    {
        $publishUrl = (string) config('realtime.publish_url');
        if (empty($publishUrl)) {
            return;
        }

        $secret = (string) config('realtime.secret');
        $timeout = (int) config('realtime.timeout_seconds', 1);

        try {
            $req = Http::timeout(max(1, $timeout))
                ->acceptJson();

            if (!empty($secret)) {
                $req = $req->withToken($secret);
            }

            $req->post($publishUrl, [
                'event' => $event,
                'data' => $data,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Realtime publish failed', [
                'publish_url' => $publishUrl,
                'event' => $event,
                'error' => $e->getMessage(),
            ]);
        }
    }
}


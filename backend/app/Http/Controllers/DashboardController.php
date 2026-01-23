<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function summary(Request $request)
    {
        return response()->json($this->buildStockStats($request));
    }

    public function salesSummary(Request $request)
    {
        $dateInput = $request->query('date');
        $date = $dateInput ? Carbon::parse($dateInput)->toDateString() : Carbon::today()->toDateString();

        $summary = DB::table('daily_sales_summaries')
            ->where('summary_date', $date)
            ->first();

        return response()->json([
            'date' => $date,
            'totalSales' => (float) ($summary->total_sales ?? 0),
            'totalCost' => (float) ($summary->total_cost ?? 0),
            'dailyExpense' => (float) ($summary->daily_expense ?? 0),
            'netProfit' => (float) ($summary->net_profit ?? 0),
        ]);
    }

    public function stockSummary(Request $request)
    {
        $stats = $this->buildStockStats($request);

        return response()->json([
            'summary' => $stats['summary'],
            'stockStatus' => $stats['stockStatus'],
            'categories' => $stats['categories'],
            'thresholds' => $stats['thresholds'],
        ]);
    }

    public function lowStock(Request $request)
    {
        $stats = $this->buildStockStats($request);

        return response()->json([
            'items' => $stats['lowStockItems'],
            'thresholds' => [
                'lowStock' => $stats['thresholds']['lowStock'],
                'limitedStock' => $stats['thresholds']['limitedStock'],
            ],
        ]);
    }

    public function nearExpire(Request $request)
    {
        $days = $this->getIntQuery($request, 'days', 30, 1);
        $today = Carbon::today();
        $cutoff = $today->copy()->addDays($days);

        $items = Product::query()
            ->select('id', 'name', 'stock', 'expiry_date', 'warranty_expiry_date')
            ->whereNotNull('expiry_date')
            ->whereDate('expiry_date', '<=', $cutoff)
            ->orderBy('expiry_date')
            ->get();

        return response()->json([
            'asOf' => $today->toDateString(),
            'days' => $days,
            'cutoff' => $cutoff->toDateString(),
            'items' => $items,
        ]);
    }

    public function systemStatus()
    {
        $lastMovementAt = StockMovement::query()->max('created_at');
        $lastSyncAt = StockMovement::query()->whereNotNull('synced_at')->max('synced_at');

        return response()->json([
            'serverTime' => Carbon::now()->toDateTimeString(),
            'totalProducts' => Product::count(),
            'totalStockMovements' => StockMovement::count(),
            'lastStockMovementAt' => $lastMovementAt,
            'lastSyncAt' => $lastSyncAt,
        ]);
    }

    private function buildStockStats(Request $request): array
    {
        $lowStockThreshold = $this->getIntQuery($request, 'low_stock_threshold', 5, 0);
        $limitedStockThreshold = $this->getIntQuery($request, 'limited_stock_threshold', 10, 0);
        if ($limitedStockThreshold < $lowStockThreshold) {
            $limitedStockThreshold = $lowStockThreshold;
        }
        $highValueThreshold = $this->getIntQuery($request, 'high_value_threshold', 10000, 0);

        $stats = [
            'summary' => [
                'totalProducts' => 0,
                'totalValue' => 0.0,
                'potentialProfit' => 0.0,
                'outOfStock' => 0,
            ],
            'stockStatus' => [
                'inStock' => 0,
                'limitedStock' => 0,
                'outOfStock' => 0,
            ],
            'categories' => [],
            'lowStockItems' => [],
            'highValueItems' => [],
            'thresholds' => [
                'lowStock' => $lowStockThreshold,
                'limitedStock' => $limitedStockThreshold,
                'highValue' => $highValueThreshold,
            ],
        ];

        $categoryStats = [];

        foreach (Product::all() as $product) {
            $stock = (int) ($product->stock ?? 0);
            $price = (float) ($product->price ?? 0);
            $cost = (float) ($product->cost ?? $product->cost_price ?? 0);

            $stats['summary']['totalProducts']++;

            $itemValue = $stock * $price;
            $itemCost = $stock * $cost;
            $stats['summary']['totalValue'] += $itemValue;
            $stats['summary']['potentialProfit'] += ($itemValue - $itemCost);

            if ($stock <= 0) {
                $stats['summary']['outOfStock']++;
                $stats['stockStatus']['outOfStock']++;
            } elseif ($stock <= $limitedStockThreshold) {
                $stats['stockStatus']['limitedStock']++;
            } else {
                $stats['stockStatus']['inStock']++;
            }

            $category = $product->category ?: 'Uncategorized';
            if (!isset($categoryStats[$category])) {
                $categoryStats[$category] = [
                    'name' => $category,
                    'count' => 0,
                    'value' => 0.0,
                    'cost' => 0.0,
                    'profit' => 0.0,
                ];
            }

            $categoryStats[$category]['count']++;
            $categoryStats[$category]['value'] += $itemValue;
            $categoryStats[$category]['cost'] += $itemCost;
            $categoryStats[$category]['profit'] += ($itemValue - $itemCost);

            if ($stock > 0 && $stock <= $lowStockThreshold) {
                $stats['lowStockItems'][] = [
                    'id' => $product->id,
                    'name' => $product->name,
                    'stock' => $stock,
                ];
            }

            if ($itemValue > $highValueThreshold) {
                $stats['highValueItems'][] = [
                    'id' => $product->id,
                    'name' => $product->name,
                    'stock' => $stock,
                    'value' => $itemValue,
                ];
            }
        }

        usort($stats['lowStockItems'], fn ($a, $b) => $a['stock'] <=> $b['stock']);
        usort($stats['highValueItems'], fn ($a, $b) => $b['value'] <=> $a['value']);

        $stats['categories'] = array_values($categoryStats);

        return $stats;
    }

    private function getIntQuery(Request $request, string $key, int $default, int $min): int
    {
        $value = $request->query($key, $default);
        if (!is_numeric($value)) {
            return $default;
        }

        $value = (int) $value;

        if ($value < $min) {
            $value = $min;
        }

        return $value;
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function summary(Request $request ) 
    {
        return response()->json($this->buildStockStats($request));
    }

    public function salesSummary(Request $request)
    {
        $dateInput = $request->query('date');
        $date = $dateInput ? Carbon::parse($dateInput)->toDateString() : Carbon::today()->toDateString();

        $totalSales = (float) (DB::table('invoices')
            ->whereDate('issued_at', $date)
            ->sum('total_amount') ?? 0);

        $totalCost = (float) (DB::table('invoice_items')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->join('products', 'invoice_items.product_id', '=', 'products.id')
            ->whereDate('invoices.issued_at', $date)
            ->selectRaw('COALESCE(SUM(invoice_items.quantity * products.standard_cost), 0) as total_cost')
            ->value('total_cost') ?? 0);

        $dailyExpense = 0.0;
        $netProfit = $totalSales - $totalCost - $dailyExpense;

        return response()->json([
            'date' => $date,
            'totalSales' => $totalSales,
            'totalCost' => $totalCost,
            'dailyExpense' => $dailyExpense,
            'netProfit' => $netProfit,
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

        $items = DB::table('lots')
            ->join('products', 'lots.product_id', '=', 'products.id')
            ->select(
                'lots.id as lot_id',
                'lots.product_id',
                'products.name',
                'lots.remaining_qty as stock',
                'lots.expiry_date',
                'lots.warranty'
            )
            ->whereNotNull('lots.expiry_date')
            ->whereDate('lots.expiry_date', '<=', $cutoff)
            ->orderBy('lots.expiry_date')
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
        $lastStockIn = DB::table('stock_ins')->max('created_at');
        $lastStockOut = DB::table('invoice_items')->max('created_at');

        $lastMovementAt = null;
        if ($lastStockIn || $lastStockOut) {
            $lastMovementAt = max(
                $lastStockIn ? strtotime($lastStockIn) : 0,
                $lastStockOut ? strtotime($lastStockOut) : 0
            );
            $lastMovementAt = date('Y-m-d H:i:s', $lastMovementAt);
        }

        return response()->json([
            'serverTime' => Carbon::now()->toDateTimeString(),
            'totalProducts' => Product::count(),
            'totalStockMovements' => DB::table('stock_ins')->count() + DB::table('invoice_items')->count(),
            'lastStockMovementAt' => $lastMovementAt,
            'lastSyncAt' => null,
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

        $products = Product::all();
        $stockMap = StockService::getStockMap($products->pluck('id')->all());
        $categoryMap = Category::query()->pluck('name', 'id')->all();

        $categoryStats = [];

        foreach ($products as $product) {
            $stock = (float) ($stockMap[$product->id] ?? 0);
            $price = (float) ($product->sale_price ?? 0);
            $cost = (float) ($product->standard_cost ?? 0);

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

            $categoryName = $categoryMap[$product->category_id] ?? 'Uncategorized';
            if (!isset($categoryStats[$categoryName])) {
                $categoryStats[$categoryName] = [
                    'name' => $categoryName,
                    'count' => 0,
                    'value' => 0.0,
                    'cost' => 0.0,
                    'profit' => 0.0,
                ];
            }

            $categoryStats[$categoryName]['count']++;
            $categoryStats[$categoryName]['value'] += $itemValue;
            $categoryStats[$categoryName]['cost'] += $itemCost;
            $categoryStats[$categoryName]['profit'] += ($itemValue - $itemCost);

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

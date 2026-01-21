<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function summary(Request $request)
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

        return response()->json($stats);
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

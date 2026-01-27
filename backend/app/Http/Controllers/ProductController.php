<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Models\StockIn;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index()
    {
        $products = Product::orderByDesc('created_at')->get();
        $stockMap = StockService::getStockMap($products->pluck('id')->all());

        $products->each(function (Product $product) use ($stockMap) {
            $product->setAttribute('stock', (float) ($stockMap[$product->id] ?? 0));
        });

        return response()->json($products);
    }

    public function store(Request $request)
    {
        $data = $this->validatedData($request, true);
        $initialStock = $data['initial_stock'] ?? $data['stock'] ?? null;
        unset($data['initial_stock'], $data['stock']);

        $product = Product::create($data);

        if ($initialStock !== null && (float) $initialStock > 0) {
            StockIn::create([
                'product_id' => $product->id,
                'quantity' => (float) $initialStock,
            ]);
        }

        $product->setAttribute('stock', (float) ($initialStock ?? 0));

        return response()->json([
            'success' => true,
            'product' => $product,
        ]);
    }

    public function update(Request $request, Product $product)
    {
        $data = $this->validatedData($request, false, $product->id);
        unset($data['initial_stock'], $data['stock']);

        $product->fill($data);
        $product->save();

        $product->setAttribute('stock', (float) StockService::getStock($product->id));

        return response()->json([
            'success' => true,
            'product' => $product,
        ]);
    }

    public function destroy(Product $product)
    {
        $product->delete();

        return response()->json(['success' => true]);
    }

    public function categories()
    {
        $categories = Category::query()
            ->orderBy('name')
            ->get(['id', 'name', 'parent_id']);

        return response()->json($categories);
    }

    private function validatedData(Request $request, bool $allowStock, ?int $productId = null): array
    {
        $rules = [
            'product_code' => [
                $productId ? 'sometimes' : 'required',
                'string',
                'max:255',
                Rule::unique('products', 'product_code')->ignore($productId),
            ],
            'name' => [$productId ? 'sometimes' : 'required', 'string', 'max:255'],
            'category_id' => ['sometimes', 'nullable', 'integer', 'exists:categories,id'],
            'unit_id' => ['sometimes', 'nullable', 'integer', 'exists:units,id'],
            'sale_unit_id' => ['sometimes', 'nullable', 'integer', 'exists:units,id'],
            'standard_cost' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'sale_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
        ];

        if ($allowStock) {
            $rules['initial_stock'] = ['nullable', 'numeric', 'min:0'];
            $rules['stock'] = ['nullable', 'numeric', 'min:0'];
        }

        return $request->validate($rules);
    }
}

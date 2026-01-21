<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index()
    {
        return response()->json(Product::orderByDesc('created_at')->get());
    }

    public function store(Request $request)
    {
        $data = $this->normalizeProductData($this->validatedData($request, true));
        $productId = $data['id'] ?? (string) Str::uuid();
        $data['id'] = $productId;

        $values = $data;
        unset($values['id']);

        $product = Product::updateOrCreate(['id' => $productId], $values);

        return response()->json([
            'success' => true,
            'product' => $product,
        ]);
    }

    public function update(Request $request, Product $product)
    {
        $data = $this->normalizeProductData($this->validatedData($request, false));
        $product->fill($data);
        $product->save();

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
        $categories = [];

        Product::query()
            ->select('category', 'subcategory')
            ->whereNotNull('category')
            ->get()
            ->each(function (Product $product) use (&$categories) {
                $category = $product->category;
                if (!$category) {
                    return;
                }

                if (!isset($categories[$category])) {
                    $categories[$category] = [];
                }

                if ($product->subcategory) {
                    $categories[$category][$product->subcategory] = true;
                }
            });

        $result = [];
        foreach ($categories as $category => $subcategories) {
            $result[$category] = array_values(array_keys($subcategories));
        }

        return response()->json($result);
    }

    private function validatedData(Request $request, bool $allowId): array
    {
        $rules = [
            'barcode' => ['nullable', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0'],
            'cost' => ['required', 'numeric', 'min:0'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            'stock' => ['required', 'integer', 'min:0'],
            'unit' => ['nullable', 'string', 'max:50'],
            'size' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'subcategory' => ['nullable', 'string', 'max:255'],
            'main_category' => ['nullable', 'string', 'max:255'],
            'sub_category' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'max:255'],
            'last_stock_added' => ['nullable', 'integer', 'min:0'],
            'last_stock_added_at' => ['nullable', 'date'],
            'expiry_date' => ['nullable', 'date'],
            'warranty_expiry_date' => ['nullable', 'date'],
            'storage_location' => ['nullable', 'string', 'max:255'],
            'sale_location' => ['nullable', 'string', 'max:255'],
        ];

        if ($allowId) {
            $rules['id'] = ['nullable', 'string', 'max:64'];
        }

        return $request->validate($rules);
    }

    private function normalizeProductData(array $data): array
    {
        $data = $this->syncProductFields($data, 'category', 'main_category');
        $data = $this->syncProductFields($data, 'subcategory', 'sub_category');
        $data = $this->syncProductFields($data, 'cost', 'cost_price');

        return $data;
    }

    private function syncProductFields(array $data, string $primary, string $secondary): array
    {
        $primaryValue = $data[$primary] ?? null;
        $secondaryValue = $data[$secondary] ?? null;

        if ($secondaryValue === null && $primaryValue !== null) {
            $data[$secondary] = $primaryValue;
        }

        if ($primaryValue === null && $secondaryValue !== null) {
            $data[$primary] = $secondaryValue;
        }

        return $data;
    }
}

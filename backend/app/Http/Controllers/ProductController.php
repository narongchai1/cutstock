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
        $data = $this->validatedData($request, true);
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
        $data = $this->validatedData($request, false);
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
            'stock' => ['required', 'integer', 'min:0'],
            'category' => ['nullable', 'string', 'max:255'],
            'subcategory' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'max:255'],
        ];

        if ($allowId) {
            $rules['id'] = ['nullable', 'string', 'max:64'];
        }

        return $request->validate($rules);
    }
}

<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreItemRequest;
use App\Models\Item;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class ItemController extends Controller
{
    public function store(StoreItemRequest $request): RedirectResponse
    {
        $item = Item::query()->create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Item created.')]);

        return to_route('dashboard', ['project' => $item->project_id]);
    }
}

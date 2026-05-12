<?php

use App\Models\Item;
use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a project has many items and an item belongs to a project', function () {
    $project = Project::create([
        'name' => 'Kitchen Plan',
    ]);

    $item = Item::create([
        'project_id' => $project->id,
        'name' => 'Side Panel',
        'quantity' => 3,
        'board' => 'plywood',
        'length' => 240.50,
        'width' => 60.00,
    ]);

    expect($project->items)->toHaveCount(1)
        ->and($project->items->first()->is($item))->toBeTrue()
        ->and($item->project->is($project))->toBeTrue();
});

test('an item requires an existing project', function () {
    expect(fn () => Item::create([
        'project_id' => 999999,
        'name' => 'Top Panel',
        'quantity' => 1,
        'board' => 'melamine',
        'length' => 120.00,
        'width' => 45.00,
    ]))->toThrow(Exception::class);
});

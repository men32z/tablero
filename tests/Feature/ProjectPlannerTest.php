<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('authenticated users can create projects', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('projects.store'), [
        'name' => 'Wardrobe Project',
    ]);

    $projectId = Project::query()->where('name', 'Wardrobe Project')->value('id');

    $response->assertRedirect(route('dashboard', ['project' => $projectId], absolute: false));

    $this->assertDatabaseHas('projects', [
        'name' => 'Wardrobe Project',
    ]);
});

test('authenticated users can add items to a project', function () {
    $user = User::factory()->create();
    $project = Project::create([
        'name' => 'Kitchen Plan',
    ]);

    $response = $this->actingAs($user)->post(route('items.store'), [
        'project_id' => $project->id,
        'name' => 'Upper Shelf',
        'quantity' => 2,
        'board' => 'plywood',
        'length' => 120,
        'width' => 45,
    ]);

    $response->assertRedirect(route('dashboard', ['project' => $project->id], absolute: false));

    $this->assertDatabaseHas('items', [
        'project_id' => $project->id,
        'name' => 'Upper Shelf',
        'quantity' => 2,
        'board' => 'plywood',
    ]);
});

test('item creation validates board type', function () {
    $user = User::factory()->create();
    $project = Project::create([
        'name' => 'Bathroom Cabinet',
    ]);

    $response = $this->actingAs($user)->post(route('items.store'), [
        'project_id' => $project->id,
        'name' => 'Door',
        'quantity' => 1,
        'board' => 'mdf',
        'length' => 80,
        'width' => 40,
    ]);

    $response->assertSessionHasErrors(['board']);
});

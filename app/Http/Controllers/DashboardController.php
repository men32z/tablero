<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $projects = Project::query()
            ->with(['items' => fn ($query) => $query->orderByDesc('id')])
            ->orderByDesc('id')
            ->get();

        return Inertia::render('Dashboard', [
            'projects' => $projects,
            'selectedProjectId' => $request->integer('project'),
            'board' => [
                'widthCm' => 122,
                'lengthCm' => 244,
            ],
            'boardTypes' => ['wood', 'plywood', 'melamine'],
        ]);
    }
}

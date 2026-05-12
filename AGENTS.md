# AGENTS

## Project Snapshot
- Stack: Laravel 13 + Inertia + Vue 3 + Tailwind CSS 4.
- Goal: optimize wood sheet usage (wood, plywood, melamine) by modeling cuts and calculating efficiency.
- Keep backend code in English; UI labels can be Spanish.

## Domain Language
- Proyecto -> Project
- Item -> Item
- Cantidad -> quantity
- Tablero -> board
- Largo -> length
- Ancho -> width

## Current Data Model
- Project
  - name
  - hasMany items
- Item
  - project_id
  - name
  - quantity
  - board
  - length
  - width
  - belongsTo project

## Coding Guidelines For Agents
- Reuse existing Laravel conventions in this repository.
- Use Eloquent relationships and typed return signatures.
- Prefer Pest for tests and run focused tests after each change.
- Avoid adding dependencies or changing architecture without explicit request.
- Keep AGENTS guidance concise and practical.

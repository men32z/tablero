<script setup lang="ts">
import { Form, Head } from '@inertiajs/vue3';
import { computed, ref } from 'vue';
import ItemController from '@/actions/App/Http/Controllers/ItemController';
import ProjectController from '@/actions/App/Http/Controllers/ProjectController';
import InputError from '@/components/InputError.vue';
import { useLocale } from '@/composables/useLocale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dashboard } from '@/routes';

type ItemRecord = {
    id: number;
    project_id: number;
    name: string;
    quantity: number;
    board: string;
    length: number | string;
    width: number | string;
};

type ProjectRecord = {
    id: number;
    name: string;
    items: ItemRecord[];
};

type Piece = {
    id: string;
    label: string;
    board: string;
    length: number;
    width: number;
};

type Placement = Piece & {
    x: number;
    y: number;
    rotated: boolean;
};

type Orientation = {
    length: number;
    width: number;
    rotated: boolean;
};

const props = withDefaults(
    defineProps<{
        projects: ProjectRecord[];
        selectedProjectId?: number | null;
        board?: {
            widthCm: number;
            lengthCm: number;
        };
        boardTypes?: string[];
    }>(),
    {
        selectedProjectId: null,
        board: () => ({ widthCm: 122, lengthCm: 244 }),
        boardTypes: () => ['wood', 'plywood', 'melamine'],
    },
);

const { locale, t } = useLocale();

defineOptions({
    layout: {
        breadcrumbs: [
            {
                title: 'Dashboard',
                href: dashboard(),
            },
        ],
    },
});

const BOARD_WIDTH_CM = props.board.widthCm;
const BOARD_LENGTH_CM = props.board.lengthCm;
const BOARD_AREA_CM2 = BOARD_WIDTH_CM * BOARD_LENGTH_CM;

const selectedProjectId = ref<number | null>(
    props.selectedProjectId ?? props.projects[0]?.id ?? null,
);

const projectDraftName = ref<string>('');
const optimizeMode = ref<'grain' | 'efficiency'>('grain');

const itemDraft = ref({
    name: '',
    quantity: 1,
    board: props.boardTypes[0] ?? 'wood',
    length: '',
    width: '',
});

const activeProject = computed(() =>
    props.projects.find((project) => project.id === selectedProjectId.value) ??
    null,
);

const itemsForView = computed(() => {
    if (!activeProject.value) {
        return [] as ItemRecord[];
    }

    const baseItems = [...activeProject.value.items];
    const quantity = Number(itemDraft.value.quantity);
    const length = Number(itemDraft.value.length);
    const width = Number(itemDraft.value.width);

    if (
        itemDraft.value.name.trim() !== '' &&
        Number.isFinite(quantity) &&
        quantity > 0 &&
        Number.isFinite(length) &&
        length > 0 &&
        Number.isFinite(width) &&
        width > 0
    ) {
        baseItems.push({
            id: -1,
            project_id: activeProject.value.id,
            name: itemDraft.value.name.trim(),
            quantity,
            board: itemDraft.value.board,
            length,
            width,
        });
    }

    return baseItems;
});

const expandedPieces = computed<Piece[]>(() => {
    return itemsForView.value.flatMap((item) => {
        const length = Number(item.length);
        const width = Number(item.width);
        const quantity = Number(item.quantity);

        if (!Number.isFinite(length) || !Number.isFinite(width) || quantity < 1) {
            return [];
        }

        return Array.from({ length: quantity }, (_, index) => ({
            id: `${item.id}-${index + 1}`,
            label: item.name,
            board: item.board,
            length,
            width,
        }));
    });
});

const boardTypeTotals = computed(() => {
    const totals = new Map<string, number>();

    for (const piece of expandedPieces.value) {
        const current = totals.get(piece.board) ?? 0;
        totals.set(piece.board, current + piece.length * piece.width);
    }

    return Array.from(totals.entries()).map(([board, area]) => ({
        board,
        area,
        percentage: BOARD_AREA_CM2 > 0 ? (area / BOARD_AREA_CM2) * 100 : 0,
    }));
});

const grainGuides = computed(() =>
    Array.from({ length: 5 }, (_, index) => ((index + 1) * BOARD_WIDTH_CM) / 6),
);

function normalizeBoardLabel(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function boardTypeLabel(value: string): string {
    const localeKey = locale.value === 'es' ? 'es' : 'en';

    switch (value) {
        case 'wood':
            return localeKey === 'es' ? t('dashboard.boardType.wood') : 'Wood';
        case 'plywood':
            return localeKey === 'es'
                ? t('dashboard.boardType.plywood')
                : 'Plywood';
        case 'melamine':
            return localeKey === 'es'
                ? t('dashboard.boardType.melamine')
                : 'Melamine';
        default:
            return normalizeBoardLabel(value);
    }
}

function pieceColors(index: number): string {
    const palette = [
        '#3b82f6',
        '#10b981',
        '#f59e0b',
        '#ef4444',
        '#8b5cf6',
        '#14b8a6',
        '#84cc16',
    ];

    return palette[index % palette.length];
}

function packPieces(pieces: Piece[], allowRotation: boolean): {
    placements: Placement[];
    overflowCount: number;
    placedArea: number;
} {
    const rows: Array<{ y: number; height: number; usedWidth: number }> = [];
    const placements: Placement[] = [];
    let usedHeight = 0;
    let overflowCount = 0;

    const sortedPieces = [...pieces].sort(
        (a, b) => b.length * b.width - a.length * a.width,
    );

    for (const piece of sortedPieces) {
        const orientations: Orientation[] = [
            { length: piece.length, width: piece.width, rotated: false },
        ];

        if (allowRotation && piece.length !== piece.width) {
            orientations.push({
                length: piece.width,
                width: piece.length,
                rotated: true,
            });
        }

        let best:
            | {
                  rowIndex: number;
                  orientation: Orientation;
                  score: number;
              }
            | null = null;

        for (const orientation of orientations) {
            if (
                orientation.length > BOARD_LENGTH_CM ||
                orientation.width > BOARD_WIDTH_CM
            ) {
                continue;
            }

            rows.forEach((row, rowIndex) => {
                if (
                    orientation.length <= row.height &&
                    row.usedWidth + orientation.width <= BOARD_WIDTH_CM
                ) {
                    const score = BOARD_WIDTH_CM - (row.usedWidth + orientation.width);

                    if (!best || score < best.score) {
                        best = { rowIndex, orientation, score };
                    }
                }
            });

            if (usedHeight + orientation.length <= BOARD_LENGTH_CM) {
                const score = 1000 + (BOARD_WIDTH_CM - orientation.width);

                if (!best || score < best.score) {
                    best = {
                        rowIndex: rows.length,
                        orientation,
                        score,
                    };
                }
            }
        }

        if (!best) {
            overflowCount++;

            continue;
        }

        if (best.rowIndex === rows.length) {
            rows.push({
                y: usedHeight,
                height: best.orientation.length,
                usedWidth: 0,
            });
            usedHeight += best.orientation.length;
        }

        const targetRow = rows[best.rowIndex];

        placements.push({
            ...piece,
            x: targetRow.usedWidth,
            y: targetRow.y,
            length: best.orientation.length,
            width: best.orientation.width,
            rotated: best.orientation.rotated,
        });

        targetRow.usedWidth += best.orientation.width;
    }

    const placedArea = placements.reduce(
        (total, placement) => total + placement.length * placement.width,
        0,
    );

    return { placements, overflowCount, placedArea };
}

const boardPreview = computed(() => {
    const result = packPieces(
        expandedPieces.value,
        optimizeMode.value === 'efficiency',
    );

    const totalArea = expandedPieces.value.reduce(
        (total, piece) => total + ( piece.length * piece.width),
        0,
    );

    const boardsRequired = totalArea > 0 ? Math.ceil(totalArea / BOARD_AREA_CM2) : 0;
    const utilization =
        BOARD_AREA_CM2 > 0 ? (result.placedArea / BOARD_AREA_CM2) * 100 : 0;
    const efficiency =
        boardsRequired > 0
            ? (totalArea / (boardsRequired * BOARD_AREA_CM2)) * 100
            : 0;

    return {
        ...result,
        totalArea,
        boardsRequired,
        utilization,
        efficiency,
    };
});
</script>

<template>
    <Head title="Dashboard" />

    <div class="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
        <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
            <div class="space-y-4">
                <section id="my-projects" class="rounded-xl border border-border bg-card p-4">
                    <div class="mb-4">
                        <h2 class="text-lg font-semibold">{{ t('dashboard.projectsTitle') }}</h2>
                        <p class="text-sm text-muted-foreground">
                            {{ t('dashboard.projectsDescription') }}
                        </p>
                    </div>

                    <Form
                        v-bind="ProjectController.store.form()"
                        :options="{ preserveScroll: true }"
                        @success="projectDraftName = ''"
                        v-slot="{ errors, processing }"
                        class="grid gap-3 sm:grid-cols-[1fr_auto]"
                    >
                        <div class="grid gap-2">
                            <Label for="project-name">{{ t('dashboard.projectName') }}</Label>
                            <Input
                                id="project-name"
                                name="name"
                                v-model="projectDraftName"
                                :placeholder="t('dashboard.projectPlaceholder')"
                                required
                            />
                            <InputError :message="errors.name" />
                        </div>
                        <Button type="submit" class="self-end" :disabled="processing">
                            {{ t('dashboard.createProject') }}
                        </Button>
                    </Form>

                    <div class="mt-4 flex flex-wrap gap-2">
                        <button
                            v-for="project in projects"
                            :key="project.id"
                            type="button"
                            @click="selectedProjectId = project.id"
                            class="rounded-md border px-3 py-1.5 text-sm transition-colors"
                            :class="
                                selectedProjectId === project.id
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border bg-background text-foreground hover:bg-accent'
                            "
                        >
                            {{ project.name }}
                        </button>
                        <p
                            v-if="projects.length === 0"
                            class="text-sm text-muted-foreground"
                        >
                            {{ t('dashboard.noProjects') }}
                        </p>
                    </div>
                </section>

                <section class="rounded-xl border border-border bg-card p-4">
                    <div class="mb-4">
                        <h2 class="text-lg font-semibold">{{ t('dashboard.cutItemsTitle') }}</h2>
                        <p class="text-sm text-muted-foreground">
                            {{ t('dashboard.cutItemsDescription') }}
                        </p>
                    </div>

                    <Form
                        v-bind="ItemController.store.form()"
                        :options="{ preserveScroll: true }"
                        @success="
                            itemDraft = {
                                ...itemDraft,
                                name: '',
                                quantity: 1,
                                length: '',
                                width: '',
                            }
                        "
                        v-slot="{ errors, processing }"
                        class="grid gap-4"
                    >
                        <input
                            type="hidden"
                            name="project_id"
                            :value="selectedProjectId ?? ''"
                        />

                        <div class="grid gap-2">
                            <Label for="item-name">{{ t('dashboard.itemName') }}</Label>
                            <Input
                                id="item-name"
                                name="name"
                                v-model="itemDraft.name"
                                :disabled="!selectedProjectId"
                                :placeholder="t('dashboard.itemPlaceholder')"
                                required
                            />
                            <InputError :message="errors.name" />
                        </div>

                        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div class="grid gap-2">
                                <Label for="item-quantity">{{ t('dashboard.quantity') }}</Label>
                                <Input
                                    id="item-quantity"
                                    type="number"
                                    min="1"
                                    step="1"
                                    name="quantity"
                                    v-model.number="itemDraft.quantity"
                                    :disabled="!selectedProjectId"
                                    required
                                />
                                <InputError :message="errors.quantity" />
                            </div>

                            <div class="grid gap-2">
                                <Label for="item-board">{{ t('dashboard.board') }}</Label>
                                <select
                                    id="item-board"
                                    name="board"
                                    v-model="itemDraft.board"
                                    :disabled="!selectedProjectId"
                                    class="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                >
                                    <option
                                        v-for="boardType in boardTypes"
                                        :key="boardType"
                                        :value="boardType"
                                    >
                                        {{ boardTypeLabel(boardType) }}
                                    </option>
                                </select>
                                <InputError :message="errors.board" />
                            </div>

                            <div class="grid gap-2">
                                <Label for="item-length">{{ t('dashboard.lengthCm') }}</Label>
                                <Input
                                    id="item-length"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    name="length"
                                    v-model="itemDraft.length"
                                    :disabled="!selectedProjectId"
                                    required
                                />
                                <InputError :message="errors.length" />
                            </div>

                            <div class="grid gap-2">
                                <Label for="item-width">{{ t('dashboard.widthCm') }}</Label>
                                <Input
                                    id="item-width"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    name="width"
                                    v-model="itemDraft.width"
                                    :disabled="!selectedProjectId"
                                    required
                                />
                                <InputError :message="errors.width" />
                            </div>
                        </div>

                        <InputError :message="errors.project_id" />

                        <div class="flex items-center justify-between">
                            <p
                                v-if="!selectedProjectId"
                                class="text-sm text-muted-foreground"
                            >
                                {{ t('dashboard.selectProjectHint') }}
                            </p>
                            <Button
                                type="submit"
                                :disabled="processing || !selectedProjectId"
                            >
                                {{ t('dashboard.addItem') }}
                            </Button>
                        </div>
                    </Form>

                    <div class="mt-6 overflow-hidden rounded-lg border border-border">
                        <table class="w-full text-sm">
                            <thead class="bg-muted/50 text-left">
                                <tr>
                                    <th class="px-3 py-2 font-medium">{{ t('dashboard.item') }}</th>
                                    <th class="px-3 py-2 font-medium">{{ t('dashboard.quantity') }}</th>
                                    <th class="px-3 py-2 font-medium">{{ t('dashboard.board') }}</th>
                                    <th class="px-3 py-2 font-medium">{{ t('dashboard.lengthCm') }}</th>
                                    <th class="px-3 py-2 font-medium">{{ t('dashboard.widthCm') }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="item in activeProject?.items ?? []"
                                    :key="item.id"
                                    class="border-t"
                                >
                                    <td class="px-3 py-2">{{ item.name }}</td>
                                    <td class="px-3 py-2">{{ item.quantity }}</td>
                                    <td class="px-3 py-2">
                                        {{ boardTypeLabel(item.board) }}
                                    </td>
                                    <td class="px-3 py-2">{{ Number(item.length) }} cm</td>
                                    <td class="px-3 py-2">{{ Number(item.width) }} cm</td>
                                </tr>
                                <tr v-if="(activeProject?.items.length ?? 0) === 0">
                                    <td
                                        colspan="5"
                                        class="px-3 py-6 text-center text-muted-foreground"
                                    >
                                        {{ t('dashboard.noItems') }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <aside class="space-y-4 rounded-xl border border-border bg-card p-4">
                <div class="space-y-1">
                    <h2 class="text-lg font-semibold">{{ t('dashboard.boardVisualTitle') }}</h2>
                    <p class="text-sm text-muted-foreground">
                        {{ t('dashboard.boardConstant', { width: BOARD_WIDTH_CM, length: BOARD_LENGTH_CM }) }}
                    </p>
                </div>

                <div class="inline-flex rounded-md border border-border bg-muted p-1">
                    <button
                        type="button"
                        @click="optimizeMode = 'grain'"
                        class="rounded px-3 py-1.5 text-sm font-medium transition"
                        :class="
                            optimizeMode === 'grain'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        "
                    >
                        {{ t('dashboard.grain') }}
                    </button>
                    <button
                        type="button"
                        @click="optimizeMode = 'efficiency'"
                        class="rounded px-3 py-1.5 text-sm font-medium transition"
                        :class="
                            optimizeMode === 'efficiency'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        "
                    >
                        {{ t('dashboard.efficiency') }}
                    </button>
                </div>

                <div class="grid grid-cols-2 gap-3 text-sm">
                    <div class="rounded-lg border border-border p-3">
                        <p class="text-muted-foreground">{{ t('dashboard.totalCutArea') }}</p>
                        <p class="mt-1 text-base font-semibold">
                            {{ boardPreview.totalArea.toFixed(2) }} cm2
                        </p>
                    </div>
                    <div class="rounded-lg border border-border p-3">
                        <p class="text-muted-foreground">{{ t('dashboard.estimatedBoards') }}</p>
                        <p class="mt-1 text-base font-semibold">
                            {{ boardPreview.boardsRequired }}
                        </p>
                    </div>
                    <div class="rounded-lg border border-border p-3">
                        <p class="text-muted-foreground">{{ t('dashboard.visibleBoardUsage') }}</p>
                        <p class="mt-1 text-base font-semibold">
                            {{ boardPreview.utilization.toFixed(1) }}%
                        </p>
                    </div>
                    <div class="rounded-lg border border-border p-3">
                        <p class="text-muted-foreground">{{ t('dashboard.totalEfficiency') }}</p>
                        <p class="mt-1 text-base font-semibold">
                            {{ boardPreview.efficiency.toFixed(1) }}%
                        </p>
                    </div>
                </div>

                <div class="rounded-xl border border-border bg-[#f8faf8] p-3 dark:bg-[#111710]">
                    <div class="mx-auto w-full max-w-60">
                        <div class="aspect-122/244 w-full overflow-hidden rounded-md border border-border bg-white dark:bg-black/30">
                            <svg
                                viewBox="0 0 122 244"
                                class="h-full w-full"
                                preserveAspectRatio="xMidYMid meet"
                            >
                                <rect
                                    x="0"
                                    y="0"
                                    :width="BOARD_WIDTH_CM"
                                    :height="BOARD_LENGTH_CM"
                                    fill="#fefce8"
                                    stroke="#a3a3a3"
                                    stroke-width="1"
                                />

                                <g v-if="optimizeMode === 'grain'">
                                    <line
                                        v-for="lineX in grainGuides"
                                        :key="`grain-${lineX}`"
                                        :x1="lineX"
                                        y1="0"
                                        :x2="lineX"
                                        :y2="BOARD_LENGTH_CM"
                                        stroke="#d6d3d1"
                                        stroke-width="0.5"
                                        stroke-dasharray="2 2"
                                    />
                                </g>

                                <g v-for="(placement, index) in boardPreview.placements" :key="placement.id">
                                    <rect
                                        :x="placement.x"
                                        :y="placement.y"
                                        :width="placement.width"
                                        :height="placement.length"
                                        :fill="pieceColors(index)"
                                        fill-opacity="0.78"
                                        stroke="#1f2937"
                                        stroke-width="0.4"
                                    />
                                </g>
                            </svg>
                        </div>
                    </div>

                    <p class="mt-3 text-xs text-muted-foreground">
                        {{
                            t('dashboard.modeSummary', {
                                mode:
                                    optimizeMode === 'grain'
                                        ? t('dashboard.grain').toLowerCase()
                                        : t('dashboard.efficiency').toLowerCase(),
                                count: boardPreview.overflowCount,
                            })
                        }}
                    </p>
                </div>

                <div class="space-y-2 text-sm">
                    <p class="font-medium">{{ t('dashboard.boardUsageByType') }}</p>
                    <div class="space-y-1">
                        <div
                            v-for="entry in boardTypeTotals"
                            :key="entry.board"
                            class="flex items-center justify-between rounded-md border border-border px-3 py-2"
                        >
                            <span>{{ boardTypeLabel(entry.board) }}</span>
                            <span class="text-muted-foreground">
                                {{ entry.area.toFixed(2) }} cm2 ({{ entry.percentage.toFixed(1) }}%)
                            </span>
                        </div>
                        <p
                            v-if="boardTypeTotals.length === 0"
                            class="text-muted-foreground"
                        >
                            {{ t('dashboard.noCuts') }}
                        </p>
                    </div>
                </div>
            </aside>
        </div>
    </div>
</template>

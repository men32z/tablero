import { computed, ref } from 'vue';

type Locale = 'en' | 'es';

type DictionaryTree = {
    [key: string]: string | DictionaryTree;
};

const STORAGE_KEY = 'madera.locale';
const DEFAULT_LOCALE: Locale = 'en';

const dictionaries: Record<Locale, DictionaryTree> = {
    en: {
        nav: {
            dashboard: 'Dashboard',
            myProjects: 'My Projects',
            repository: 'Repository',
            documentation: 'Documentation',
            platform: 'Platform',
            navigationMenu: 'Navigation menu',
            toggleLanguage: 'Switch language',
            search: 'Search',
        },
        dashboard: {
            projectsTitle: 'Projects',
            projectsDescription: 'Create a project and then select one to add cut items.',
            projectName: 'Project name',
            projectPlaceholder: 'e.g. Main kitchen',
            createProject: 'Create project',
            noProjects: 'No projects yet.',
            cutItemsTitle: 'Cut Items',
            cutItemsDescription: 'Quantity, Board, Length and Width in centimeters.',
            itemName: 'Item name',
            itemPlaceholder: 'e.g. Upper side panel',
            quantity: 'Quantity',
            board: 'Board',
            lengthCm: 'Length (cm)',
            widthCm: 'Width (cm)',
            selectProjectHint: 'Select a project to add items.',
            addItem: 'Add item',
            item: 'Item',
            noItems: 'Add items to start calculating cuts.',
            boardVisualTitle: 'Board Preview',
            boardConstant: 'Fixed board: :width cm x :length cm.',
            grain: 'Grain',
            efficiency: 'Efficiency',
            totalCutArea: 'Total cut area',
            estimatedBoards: 'Estimated boards',
            visibleBoardUsage: 'Visible board usage',
            totalEfficiency: 'Overall efficiency',
            modeSummary: 'Mode :mode. :count pieces out of the first board.',
            boardUsageByType: 'Usage by board type',
            noCuts: 'No cuts to display.',
            boardType: {
                wood: 'Wood',
                plywood: 'Plywood',
                melamine: 'Melamine',
            },
        },
    },
    es: {
        nav: {
            dashboard: 'Tablero',
            myProjects: 'Mis proyectos',
            repository: 'Repositorio',
            documentation: 'Documentacion',
            platform: 'Plataforma',
            navigationMenu: 'Menu de navegacion',
            toggleLanguage: 'Cambiar idioma',
            search: 'Buscar',
        },
        dashboard: {
            projectsTitle: 'Proyectos',
            projectsDescription: 'Crea un proyecto y luego selecciona uno para agregar cortes.',
            projectName: 'Nombre del proyecto',
            projectPlaceholder: 'Ej. Cocina principal',
            createProject: 'Crear proyecto',
            noProjects: 'No hay proyectos todavia.',
            cutItemsTitle: 'Items de corte',
            cutItemsDescription: 'Cantidad, Tablero, Largo y Ancho en centimetros.',
            itemName: 'Nombre del item',
            itemPlaceholder: 'Ej. Lateral superior',
            quantity: 'Cantidad',
            board: 'Tablero',
            lengthCm: 'Largo (cm)',
            widthCm: 'Ancho (cm)',
            selectProjectHint: 'Selecciona un proyecto para agregar items.',
            addItem: 'Agregar item',
            item: 'Item',
            noItems: 'Agrega items para empezar a calcular cortes.',
            boardVisualTitle: 'Visual del tablero',
            boardConstant: 'Tablero constante: :width cm x :length cm.',
            grain: 'Veta',
            efficiency: 'Eficiencia',
            totalCutArea: 'Area total de cortes',
            estimatedBoards: 'Tableros estimados',
            visibleBoardUsage: 'Uso tablero visible',
            totalEfficiency: 'Eficiencia total',
            modeSummary: 'Modo :mode. :count piezas fuera del primer tablero.',
            boardUsageByType: 'Uso por tipo de tablero',
            noCuts: 'Sin cortes para mostrar.',
            boardType: {
                wood: 'Madera',
                plywood: 'Triplay',
                melamine: 'Melamina',
            },
        },
    },
};

function isLocale(value: string | null): value is Locale {
    return value === 'en' || value === 'es';
}

function resolveInitialLocale(): Locale {
    if (typeof window === 'undefined') {
        return DEFAULT_LOCALE;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (isLocale(stored)) {
        return stored;
    }

    return DEFAULT_LOCALE;
}

const localeRef = ref<Locale>(resolveInitialLocale());

function translateFromDictionary(key: string, locale: Locale): string | undefined {
    const chunks = key.split('.');
    let cursor: string | DictionaryTree = dictionaries[locale];

    for (const chunk of chunks) {
        if (typeof cursor === 'string') {
            return undefined;
        }

        cursor = cursor[chunk] as string | DictionaryTree;

        if (!cursor) {
            return undefined;
        }
    }

    return typeof cursor === 'string' ? cursor : undefined;
}

function interpolate(template: string, params: Record<string, string | number>): string {
    return template.replace(/:([a-zA-Z0-9_]+)/g, (_, token: string) => {
        return String(params[token] ?? `:${token}`);
    });
}

export function useLocale() {
    function setLocale(next: Locale): void {
        localeRef.value = next;

        if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_KEY, next);
        }
    }

    function toggleLocale(): void {
        setLocale(localeRef.value === 'en' ? 'es' : 'en');
    }

    function t(key: string, params: Record<string, string | number> = {}): string {
        const translated =
            translateFromDictionary(key, localeRef.value) ??
            translateFromDictionary(key, DEFAULT_LOCALE) ??
            key;

        return interpolate(translated, params);
    }

    return {
        locale: computed(() => localeRef.value),
        localeLabel: computed(() => localeRef.value.toUpperCase()),
        setLocale,
        toggleLocale,
        t,
    };
}

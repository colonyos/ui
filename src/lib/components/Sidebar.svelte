<script lang="ts">
    import { page } from "$app/stores";
    import { themeStore } from "$lib/stores/themeStore";

    const tabs = [
        { name: "Colony Overview", path: "/overview" },
        { name: "Executors", path: "/executors" },
        { name: "Functions", path: "/functions" },
        { name: "Processes", path: "/processes" },
        { name: "Workflows", path: "/workflows" },
        { name: "Cron", path: "/cron" },
        { name: "Generators", path: "/generators" },
        { name: "Blueprints", path: "/blueprints" },
        { name: "Files", path: "/filesystem" },
        { name: "Server", path: "/server" },
    ];

    function toggleTheme() {
        console.log('Toggle theme clicked');
        themeStore.toggle();
    }
</script>

<aside
    class="w-64 bg-slate-100 dark:bg-slate-900 h-screen fixed left-0 top-0 overflow-y-auto border-r border-slate-200 dark:border-slate-700"
>
    <div class="p-4 flex flex-col h-full">
        <div class="mb-8 flex justify-center">
            <img src="/logo_transparent.png" alt="Colonies" class="h-16 w-auto" />
        </div>
        <nav class="flex-1">
            <ul class="space-y-2">
                {#each tabs as tab}
                    <li>
                        <a
                            href={tab.path}
                            class="block px-4 py-2 rounded-lg transition-colors duration-200 {((tab.path === '/filesystem' ? $page.url.pathname.startsWith('/filesystem') : false) || (tab.path === '/overview' ? $page.url.pathname.startsWith('/overview') : false) || (tab.path === '/blueprints' ? ($page.url.pathname.startsWith('/blueprint') || $page.url.pathname === '/blueprints') : false) || $page.url.pathname === tab.path)
                                ? 'bg-blue-600 dark:bg-blue-700 text-white font-semibold shadow-md'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}"
                        >
                            {tab.name}
                        </a>
                    </li>
                {/each}
            </ul>
        </nav>

        <!-- Theme Toggle Button -->
        <div class="mt-4">
            <button
                type="button"
                onclick={toggleTheme}
                class="p-3 rounded-lg transition-colors duration-200 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                aria-label="Toggle theme"
                title="Toggle dark/light mode"
            >
                <!-- Moon icon for light mode (shows "click for dark mode") -->
                <svg class="w-6 h-6 dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <!-- Sun icon for dark mode (shows "click for light mode") -->
                <svg class="w-6 h-6 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            </button>
        </div>
    </div>
</aside>

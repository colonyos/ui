<script lang="ts">
    import { page } from "$app/stores";

    const tabs = [
        { name: "Dashboard", path: "/" },
        { name: "Colony Overview", path: "/colony-overview" },
        { name: "Executors", path: "/executors" },
        { name: "Functions", path: "/functions" },
        { name: "Processes", path: "/processes" },
        { name: "Workflows", path: "/workflows" },
        { name: "Cron", path: "/cron" },
        { name: "Generators", path: "/generators" },
        { name: "Server", path: "/server" },
    ];
</script>

<aside
    class="w-64 bg-gray-900 text-white h-screen fixed left-0 top-0 overflow-y-auto"
>
    <div class="p-4">
        <div class="mb-8 flex justify-center">
            <img src="/logo_transparent.png" alt="Colonies" class="h-16 w-auto" />
        </div>
        <nav>
            <ul class="space-y-2">
                {#each tabs as tab}
                    <li>
                        <a
                            href={tab.path}
                            class="block px-4 py-2 rounded-lg transition-colors duration-200 {$page
                                .url.pathname === tab.path
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-300 hover:bg-gray-800 hover:text-white'}"
                        >
                            {tab.name}
                        </a>
                    </li>
                {/each}
            </ul>
        </nav>
    </div>
</aside>

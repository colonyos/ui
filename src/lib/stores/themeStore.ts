import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'light' | 'dark';

// Initialize theme from localStorage or system preference
const getInitialTheme = (): Theme => {
    if (!browser) return 'light';

    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) return stored;

    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }

    return 'light';
};

const createThemeStore = () => {
    const { subscribe, set, update } = writable<Theme>(getInitialTheme());

    return {
        subscribe,
        toggle: () => {
            update(theme => {
                const newTheme = theme === 'light' ? 'dark' : 'light';
                if (browser) {
                    console.log('Toggling theme from', theme, 'to', newTheme);
                    console.log('Document element classes before:', document.documentElement.className);
                    localStorage.setItem('theme', newTheme);
                    if (newTheme === 'dark') {
                        document.documentElement.classList.add('dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                    }
                    console.log('Document element classes after:', document.documentElement.className);
                }
                return newTheme;
            });
        },
        set: (theme: Theme) => {
            if (browser) {
                localStorage.setItem('theme', theme);
                if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            }
            set(theme);
        },
        init: () => {
            const theme = getInitialTheme();
            if (browser) {
                if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            }
            set(theme);
        }
    };
};

export const themeStore = createThemeStore();

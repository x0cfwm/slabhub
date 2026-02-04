"use client";

export type Theme = "light" | "cyberpunk" | "dark";

const THEME_STORAGE_KEY = "slabhub-theme";

export function getStoredTheme(): Theme {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem(THEME_STORAGE_KEY) as Theme) || "light";
}

export function setStoredTheme(theme: Theme) {
    if (typeof window === "undefined") return;
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    // Apply theme class to html element
    const root = window.document.documentElement;
    root.classList.remove("theme-light", "theme-cyberpunk", "theme-dark", "dark");
    root.classList.add(`theme-${theme}`);
    if (theme === "dark") {
        root.classList.add("dark");
    }
}

export function applyTheme(theme: Theme) {
    if (typeof window === "undefined") return;
    const root = window.document.documentElement;
    root.classList.remove("theme-light", "theme-cyberpunk", "theme-dark", "dark");
    root.classList.add(`theme-${theme}`);
    if (theme === "dark") {
        root.classList.add("dark");
    }
}

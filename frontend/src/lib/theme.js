import { useSyncExternalStore } from "react";

// The "dark" class on <html> is the single source of truth.
// index.html applies the saved theme before React loads, so there is no flash.
const STORAGE_KEY = "theme";
const listeners = new Set();

const getTheme = () =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

export const setTheme = (theme) => {
  document.documentElement.classList.toggle("dark", theme === "dark");

  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // storage unavailable (private mode) - theme still applies for this page
  }

  listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme);

  return {
    theme,
    toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
  };
}

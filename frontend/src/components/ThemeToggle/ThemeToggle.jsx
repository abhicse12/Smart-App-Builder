import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

function ThemeToggle({ className }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex h-8 w-15 shrink-0 items-center rounded-full border border-white/70 bg-white/50 p-0.5 backdrop-blur dark:border-white/10 dark:bg-white/5 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
        className
      )}
    >
      {/* Track icons */}
      <Sun className="absolute left-2 size-3.5 text-warning" />
      <Moon className="absolute right-2 size-3.5 text-muted-foreground" />

      {/* Knob */}
      <span
        className={cn(
          "relative z-10 flex size-6.5 items-center justify-center rounded-full bg-card shadow-sm ring-1 ring-border transition-transform duration-300",
          isDark && "translate-x-7"
        )}
      >
        {isDark ? (
          <Moon className="size-3.5 text-primary" />
        ) : (
          <Sun className="size-3.5 text-warning" />
        )}
      </span>
    </button>
  );
}

export default ThemeToggle;

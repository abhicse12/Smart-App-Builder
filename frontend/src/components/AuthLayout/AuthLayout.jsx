import { Bot, Code2, ShieldCheck, Sparkles } from "lucide-react";

import ThemeToggle from "@/components/ThemeToggle/ThemeToggle";

const features = [
  {
    icon: Bot,
    title: "Architect Agent",
    text: "Turns your requirements into an application design.",
  },
  {
    icon: Code2,
    title: "Coder Agent",
    text: "Writes the full-stack source code for you.",
  },
  {
    icon: ShieldCheck,
    title: "Tester Agent",
    text: "Validates and fixes the generated project.",
  },
];

// Full-screen shell for the login and signup pages
function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-dvh w-full bg-background text-foreground">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 overflow-hidden bg-linear-to-br from-indigo-50 via-violet-50 to-sky-50 p-12 lg:flex lg:flex-col lg:justify-between xl:p-16 dark:from-indigo-950/60 dark:via-background dark:to-sky-950/40">
        <div className="pointer-events-none absolute -left-24 top-1/4 size-96 rounded-full bg-violet-300/30 blur-3xl dark:bg-violet-600/15" />
        <div className="pointer-events-none absolute -bottom-24 right-0 size-96 rounded-full bg-sky-300/30 blur-3xl dark:bg-sky-600/10" />

        <div className="relative flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-primary to-violet-500 shadow-lg shadow-primary/30">
            <Sparkles className="size-5 text-white" />
          </div>

          <div className="leading-tight">
            <p className="font-semibold">AI App Builder</p>
            <p className="text-xs text-muted-foreground">
              Multi-Agent Platform
            </p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <h2 className="text-3xl font-bold leading-tight tracking-tight xl:text-4xl">
            From an idea to a running app,{" "}
            <span className="bg-linear-to-r from-primary to-violet-500 bg-clip-text text-transparent">
              built by AI agents.
            </span>
          </h2>

          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Describe what you need. A team of AI agents designs,
            codes and tests your application, then runs it in a
            Docker sandbox.
          </p>

          <div className="mt-10 space-y-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex items-start gap-4 rounded-xl border border-white/60 bg-white/60 p-4 shadow-sm backdrop-blur dark:border-white/5 dark:bg-white/5"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="size-4.5 text-primary" />
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    {feature.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {feature.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-muted-foreground">
          © {new Date().getFullYear()} AI App Builder
        </p>
      </div>

      {/* Form panel */}
      <div className="relative flex w-full flex-col items-center justify-center px-4 py-12 sm:px-6 lg:w-1/2">
        <ThemeToggle className="absolute right-4 top-4 sm:right-6 sm:top-6" />

        <div className="w-full max-w-sm">
          {/* Logo (small screens only) */}
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-linear-to-br from-primary to-violet-500 shadow-lg shadow-primary/30">
              <Sparkles className="size-5 text-white" />
            </div>

            <p className="text-lg font-semibold">AI App Builder</p>
            <p className="text-sm text-muted-foreground">
              Multi-Agent AI Development Platform
            </p>
          </div>

          <h1 className="text-2xl font-bold tracking-tight">
            {title}
          </h1>

          <p className="mt-1.5 text-sm text-muted-foreground">
            {subtitle}
          </p>

          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

// Shared field styles for the auth forms
export const authInputClass =
  "h-11 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-ring/30";

export const authLabelClass =
  "mb-1.5 block text-sm font-medium text-foreground";

export const authIconClass =
  "absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground";

export const authButtonClass =
  "h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60";

export default AuthLayout;

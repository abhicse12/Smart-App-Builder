import { Bot, Code2, ShieldCheck, Sparkles } from "lucide-react";

import ThemeToggle from "@/components/ThemeToggle/ThemeToggle";
import Wallpaper from "@/components/Wallpaper/Wallpaper";

const features = [
  {
    icon: Bot,
    title: "Architect Agent",
    text: "Turns your requirements into an application design.",
    tone: "from-indigo-500 to-violet-500 shadow-indigo-500/30",
  },
  {
    icon: Code2,
    title: "Coder Agent",
    text: "Writes the full-stack source code for you.",
    tone: "from-pink-500 to-rose-400 shadow-pink-500/30",
  },
  {
    icon: ShieldCheck,
    title: "Tester Agent",
    text: "Validates and fixes the generated project.",
    tone: "from-sky-500 to-cyan-400 shadow-sky-500/30",
  },
];

// Full-screen shell for the login and signup pages
function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="relative flex min-h-dvh w-full text-foreground">
      <Wallpaper />

      <ThemeToggle className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6" />

      {/* Brand panel */}
      <div className="hidden w-1/2 flex-col justify-between p-12 lg:flex xl:p-16">
        <div className="float-in flex items-center gap-3">
          <div className="btn-glow flex size-10 items-center justify-center rounded-xl">
            <Sparkles className="size-5 text-white" />
          </div>

          <div className="leading-tight">
            <p className="font-semibold">AI App Builder</p>
            <p className="text-xs text-muted-foreground">
              Multi-Agent Platform
            </p>
          </div>
        </div>

        <div className="max-w-lg">
          <h2
            className="float-in text-4xl font-bold leading-tight tracking-tight xl:text-5xl"
            style={{ "--d": "80ms" }}
          >
            From an idea to a running app,{" "}
            <span className="text-gradient">
              built by AI agents.
            </span>
          </h2>

          <p
            className="float-in mt-5 text-base leading-7 text-muted-foreground"
            style={{ "--d": "160ms" }}
          >
            Describe what you need. A team of AI agents designs,
            codes and tests your application, then runs it in a
            Docker sandbox.
          </p>

          <div className="mt-10 space-y-3">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="glass glass-hover float-in flex items-start gap-4 rounded-2xl p-4"
                style={{ "--d": `${260 + index * 110}ms` }}
              >
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br shadow-lg ${feature.tone}`}
                >
                  <feature.icon className="size-5 text-white" />
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

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} AI App Builder
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col items-center justify-center px-4 py-16 sm:px-6 lg:w-1/2">
        <div className="glass-strong pop-in w-full max-w-md rounded-3xl p-7 sm:p-9">
          {/* Logo (small screens only) */}
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <div className="btn-glow mb-3 flex size-11 items-center justify-center rounded-xl">
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
  "glass-inset h-11 w-full rounded-xl pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-ring/30";

export const authLabelClass =
  "mb-1.5 block text-sm font-medium text-foreground";

export const authIconClass =
  "absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground";

export const authButtonClass =
  "btn-glow h-11 w-full rounded-xl text-sm font-semibold transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60";

export default AuthLayout;

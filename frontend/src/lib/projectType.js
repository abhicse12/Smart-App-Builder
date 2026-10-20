// Same rule as the backend (services/consoleProject.js): a stack of only
// Python or only Java builds a basic console program, not a web app.
const WEB_TECH =
  /react|vite|next|html|css|tailwind|javascript|typescript|node|express|mongo|mern|fastapi|django|flask|uvicorn|spring|mysql|postgres/i;

export const getConsoleLanguage = (techStack = []) => {
  const list = (Array.isArray(techStack) ? techStack : []).map((tech) =>
    String(tech).trim().toLowerCase()
  );

  if (list.length === 0 || list.some((tech) => WEB_TECH.test(tech))) {
    return null;
  }

  const hasPython = list.some((tech) => /python/.test(tech));
  const hasJava = list.some((tech) => /\bjava\b/.test(tech));

  if (hasPython && hasJava) return null;
  if (hasPython) return "python";
  if (hasJava) return "java";
  return null;
};

export const languageLabel = (language) =>
  language === "python" ? "Python" : language === "java" ? "Java" : "";

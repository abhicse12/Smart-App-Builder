// Which projects belong to the Python full-stack generator (FastAPI + React).
// Python-only and Python + HTML/CSS stay with services/consoleProject.js.

const OTHER_BACKEND = /node|express|mern|next|django|flask|spring|\bjava\b/;

const normalizePath = (filePath = "") =>
  String(filePath).replace(/\\/g, "/").replace(/^\.\//, "");

// From the technologies the user selected
export const isPythonFullstack = (techStack = []) => {
  const list = Array.isArray(techStack)
    ? techStack.map((tech) => String(tech).trim().toLowerCase())
    : [];

  if (list.some((tech) => OTHER_BACKEND.test(tech))) {
    return false;
  }

  const hasPython = list.includes("python");
  const hasFastApi = list.some((tech) => tech.includes("fastapi"));
  const hasReact = list.some((tech) => /react|vite/.test(tech));

  return hasFastApi || (hasPython && hasReact);
};

// From generated files (validator, fixer and modify flow do not know the
// selected stack)
export const isPythonFullstackFiles = (files = []) => {
  const paths = new Set(files.map((file) => normalizePath(file?.path)));

  return (
    paths.has("backend/requirements.txt") &&
    paths.has("backend/app/main.py") &&
    !paths.has("backend/package.json")
  );
};

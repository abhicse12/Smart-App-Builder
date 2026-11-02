import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const TEMPLATES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "templates"
);

// Project paths whose template file has another name in this repository
// (a real .gitignore here would apply to the templates themselves)
const RENAMED = { "gitignore.txt": ".gitignore" };

// Only these may be changed after generation (the look of the auth pages).
// Every other template is locked, so the Fixer and Modify agents can never
// break authentication, the API client or the build setup.
const EDITABLE_TEMPLATES = new Set([
  "frontend/src/index.css",
  "frontend/src/pages/Login.jsx",
  "frontend/src/pages/Signup.jsx",
]);

// What the AI may create or change, besides the editable templates
const AI_PATHS = [
  /^backend\/app\/(routers|services|schemas)\/[\w/-]+\.py$/,
  /^backend\/data\/[\w-]+\.json$/,
  /^frontend\/src\/App\.jsx$/,
  /^frontend\/src\/(pages|components|hooks|utils)\/[\w/.-]+\.(jsx?|css)$/,
  /^frontend\/src\/services\/[\w-]+\.js$/,
  /^README\.md$/,
];

const normalizePath = (filePath = "") =>
  String(filePath).replace(/\\/g, "/").replace(/^\.\//, "");

const readTemplates = (directory = TEMPLATES_DIR) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return readTemplates(fullPath);
    }

    const relativePath = path
      .relative(TEMPLATES_DIR, fullPath)
      .split(path.sep)
      .join("/");

    return [
      {
        path: RENAMED[relativePath] || relativePath,
        content: fs.readFileSync(fullPath, "utf8"),
      },
    ];
  });

export const TEMPLATE_FILES = readTemplates();

const TEMPLATE_PATHS = new Set(TEMPLATE_FILES.map((file) => file.path));

export const LOCKED_PATHS = [...TEMPLATE_PATHS].filter(
  (filePath) => !EDITABLE_TEMPLATES.has(filePath)
);

const LOCKED = new Set(LOCKED_PATHS);

// May the AI write this path? Locked templates and anything outside the
// project layout (e.g. backend/package.json) are refused.
export const isAiWritablePath = (filePath) => {
  const normalized = normalizePath(filePath);

  if (LOCKED.has(normalized)) {
    return false;
  }

  return (
    EDITABLE_TEMPLATES.has(normalized) ||
    AI_PATHS.some((pattern) => pattern.test(normalized))
  );
};

// Remove what the AI may not write from a { files: [...] } answer
export const keepAiWritableFiles = (result) => {
  if (!result || !Array.isArray(result.files)) {
    return result;
  }

  const files = result.files.filter((file) => {
    const allowed = isAiWritablePath(file?.path);

    if (!allowed) {
      console.warn(`Python stack: ignoring AI change to ${file?.path}`);
    }

    return allowed;
  });

  return { ...result, files };
};

// Registered users (password hashes) are not sent to the AI providers
export const withoutUserData = (files = []) =>
  files.filter(
    (file) => normalizePath(file?.path) !== "backend/data/users.json"
  );

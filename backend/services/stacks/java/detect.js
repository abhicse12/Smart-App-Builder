// Which projects belong to the Java full-stack generator (Spring Boot + React).
// Java-only and Java + HTML/CSS stay with services/consoleProject.js.

const OTHER_BACKEND = /node|express|mern|next|django|flask|fastapi|uvicorn|python/;

const normalizePath = (filePath = "") =>
  String(filePath).replace(/\\/g, "/").replace(/^\.\//, "");

// From the technologies the user selected
export const isJavaFullstack = (techStack = []) => {
  const list = Array.isArray(techStack)
    ? techStack.map((tech) => String(tech).trim().toLowerCase())
    : [];

  if (list.some((tech) => OTHER_BACKEND.test(tech))) {
    return false;
  }

  const hasJava = list.includes("java");
  const hasSpring = list.some((tech) => tech.includes("spring"));
  const hasReact = list.some((tech) => /react|vite/.test(tech));

  return hasSpring || (hasJava && hasReact);
};

// From generated files (validator, fixer and modify flow do not know the
// selected stack)
export const isJavaFullstackFiles = (files = []) => {
  const paths = new Set(files.map((file) => normalizePath(file?.path)));

  return (
    paths.has("backend/pom.xml") &&
    paths.has("backend/src/main/java/com/app/Application.java") &&
    !paths.has("backend/package.json")
  );
};

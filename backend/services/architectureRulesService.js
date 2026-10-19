import fs from "fs/promises";
import path from "path";

const ARCHITECTURE_DIR = path.join(
  process.cwd(),
  "rag",
  "architecture"
);

const normalizeTechStack = (techStack = []) => {
  if (!Array.isArray(techStack)) {
    return [];
  }

  return techStack.map((tech) =>
    String(tech).trim().toLowerCase()
  );
};

const getArchitectureRuleFiles = (techStack = []) => {
  const normalized = normalizeTechStack(techStack);

  const files = ["common.md"];

  const hasReact = normalized.some(
    (tech) =>
      tech.includes("react") ||
      tech.includes("vite")
  );

  const isStaticWeb =
    normalized.some(
      (tech) =>
        tech.includes("html") ||
        tech.includes("css") ||
        tech.includes("javascript") ||
        tech.includes("static")
    ) && !hasReact;

  const isMERN =
    normalized.some(
      (tech) =>
        tech.includes("mern") ||
        tech.includes("mongodb")
    );

  const isPythonFastAPI =
    normalized.some(
      (tech) =>
        tech.includes("python") ||
        tech.includes("fastapi")
    );

  const isJavaSpringBoot =
    normalized.some(
      (tech) =>
        tech.includes("java") ||
        tech.includes("spring")
    );

  if (isStaticWeb) {
    files.push("static-web.md");
  }

  if (hasReact) {
    files.push("react-vite.md");
  }

  if (isMERN) {
    files.push("mern.md");
  }

  if (isPythonFastAPI) {
    files.push("python-fastapi.md");
  }

  if (isJavaSpringBoot) {
    files.push("java-springboot.md");
  }

  return files;
};

const loadArchitectureRules = async (
  techStack = []
) => {
  const files =
    getArchitectureRuleFiles(techStack);

  const sections = [];

  for (const file of files) {
    const filePath = path.join(
      ARCHITECTURE_DIR,
      file
    );

    try {
      const content = await fs.readFile(
        filePath,
        "utf-8"
      );

      sections.push(
        `\n===== ${file} =====\n${content}`
      );
    } catch (error) {
      console.error(
        `Failed to load architecture file: ${file}`,
        error
      );
    }
  }

  return sections.join("\n");
};

export default loadArchitectureRules;
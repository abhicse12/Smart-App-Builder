import fs from "fs/promises";
import path from "path";
import { detectTechAreas } from "./techStackMatcher.js";

const ARCHITECTURE_DIR = path.join(
  process.cwd(),
  "rag",
  "architecture"
);

// Areas that have a rule file in rag/architecture (in load order)
const RULE_FILE_AREAS = [
  "static-web",
  "react-vite",
  "mern",
  "python-fastapi",
  "java-springboot",
];

const getArchitectureRuleFiles = (techStack = []) => {
  const areas = detectTechAreas(techStack);

  return [
    "common.md",
    ...RULE_FILE_AREAS.filter((area) => areas.has(area)).map(
      (area) => `${area}.md`
    ),
  ];
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
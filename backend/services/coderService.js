import generateWithAI from "./aiService.js";

const generateFileCode = async ({
  projectName,
  description,
  techStack,
  file,
  allFiles,
}) => {
  const coderPrompt = `
You are the Coder Agent in an AI application builder.

Project Name:
${projectName}

Project Description:
${description}

Technology Stack:
${techStack.join(", ")}

Generate ONLY this file:

Path:
${file.path}

Purpose:
${file.purpose}

Complete project structure:

${allFiles.map((f) => `- ${f.path}`).join("\n")}

IMPORTANT RULES:

1. Generate complete production-ready code.
2. Generate only the requested file.
3. Do not use markdown.
4. Do not use code fences.
5. Do not add explanations.
6. Every import must reference an existing file.
7. Include all necessary logic.
8. Do not use placeholder code.
9. Use proper formatting.
10. Return ONLY valid JSON.

Required response format:

{
  "path": "${file.path}",
  "content": "complete source code here"
}
`;

  return await generateWithAI(coderPrompt);
};

export default generateFileCode;
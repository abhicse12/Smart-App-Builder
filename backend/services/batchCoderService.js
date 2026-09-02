import generateWithAI from "./aiService.js";

const generateBatchCode = async ({
  projectName,
  description,
  techStack,
  files,
  allFiles,
}) => {
  const batchPrompt = `
You are the Coder Agent in an AI application builder.

Project Name:
${projectName}

Project Description:
${description}

Technology Stack:
${techStack.join(", ")}

You need to generate code for the following files:

${files
  .map(
    (file) => `
Path: ${file.path}
Purpose: ${file.purpose}
`
  )
  .join("\n")}

Complete project file structure:

${allFiles.map((file) => `- ${file.path}`).join("\n")}

IMPORTANT RULES:

1. Generate ALL requested files completely.
2. Do not skip any requested file.
3. Do not generate files outside the requested batch.
4. Generate production-ready code.
5. Every import must point to a file in the project structure.
6. Include correct dependencies.
7. Do not use placeholder code.
8. Keep proper formatting and indentation.
9. Do not use markdown.
10. Do not use code fences.
11. Return ONLY valid JSON.

The response MUST follow exactly this format:

{
  "files": [
    {
      "path": "file-path",
      "content": "complete file content"
    }
  ]
}

IMPORTANT:

The number of generated files MUST equal the number of requested files.

Do not omit any file.
`;

  return await generateWithAI(batchPrompt);
};

export default generateBatchCode;
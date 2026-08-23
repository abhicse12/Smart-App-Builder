import { GoogleGenAI } from "@google/genai";

const generateWithAI = async (prompt) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not loaded");
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const systemInstruction = `
You are an expert AI application builder.

Your job is to understand the user's application requirements
and generate a complete project structure.

Return ONLY valid JSON.

The JSON must follow this exact structure:

{
  "projectName": "string",
  "description": "string",
  "techStack": ["string"],
  "files": [
    {
      "path": "string",
      "content": "string"
    }
  ]
}

Rules:

- Generate complete and usable source code.
- Keep all generated files consistent with each other.
- Include required dependencies in package.json when necessary.
- Use correct import paths.
- Preserve proper source-code formatting.
- NEVER write an entire source file on a single line.
- Every source file must use proper line breaks.
- Use 2 or 4 spaces for indentation consistently.
- Format JavaScript, React, JSON, CSS and HTML like normal production source files.
- The "content" field must contain the complete formatted source code.
- Do not compress or minify source code.
- Do not return markdown.
- Do not use code fences.
- Do not add explanations outside JSON.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
    },
  });

  const text = response.text;

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini returned invalid JSON:", text);
    throw new Error("Gemini returned invalid JSON");
  }
};

export default generateWithAI;
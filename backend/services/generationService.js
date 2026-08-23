import generateWithAI from "./aiService.js";

const generateApp = async (prompt) => {
  const result = await generateWithAI(prompt);

  return result;
};

export default generateApp;
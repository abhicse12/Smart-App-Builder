import generateApp from "../services/generationService.js";

export const generateProject = async (req, res) => {
  try {
    const { projectId, prompt } = req.body;

    if (!projectId || !prompt) {
      return res.status(400).json({
        success: false,
        message: "projectId and prompt are required",
      });
    }

    const result = await generateApp(prompt);

    res.status(200).json({
      success: true,
      projectId,
      result,
    });
  } catch (error) {
    console.error("Generation Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate application",
      error: error.message,
    });
  }
};
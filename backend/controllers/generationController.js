import generateApp from "../services/generationService.js";
import Project from "../models/Project.js";
import generateProjectFiles from "../services/fileGenerationService.js";

export const generateProject = async (req, res) => {
  try {
    const { projectId, prompt } = req.body;

    if (!projectId || !prompt) {
      return res.status(400).json({
        success: false,
        message: "projectId and prompt are required",
      });
    }

    // 1. Generate project using AI
    const result = await generateApp(prompt);

    // 2. Find existing project
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Optional: Stop if validation failed
    if (result.validation && !result.validation.valid) {
      return res.status(400).json({
        success: false,
        message: "Generated project validation failed",
        validation: result.validation,
      });
    }

    // 3. Generate and format actual project files
    const { projectRoot, formattedFiles } =
      await generateProjectFiles(
        projectId,
        result.files
      );

    // 4. Save generated data into MongoDB
    project.name = result.projectName;
    project.description = result.description;
    project.techStack = result.techStack;
    project.files = formattedFiles;

    // 5. Update project status
    project.status = "generated";

    await project.save();

    // 6. Send response
    return res.status(200).json({
      success: true,
      message: "Application generated successfully",
      projectId: project._id,
      projectPath: projectRoot,

      validation: result.validation,

      result: {
        projectName: result.projectName,
        description: result.description,
        techStack: result.techStack,
        files: formattedFiles,
      },
    });
  } catch (error) {
    console.error("Generation Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate application",
      error: error.message,
    });
  }
};
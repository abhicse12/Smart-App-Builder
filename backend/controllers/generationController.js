import generateApp from "../services/generationService.js";
import Project from "../models/Project.js";
import generateProjectFiles from "../services/fileGenerationService.js";

export const generateProject = async (req, res) => {
  try {
    const { projectId, prompt } = req.body;

    // ==========================================
    // 1. Validate request
    // ==========================================

    if (!projectId || !prompt) {
      return res.status(400).json({
        success: false,
        message: "Project ID and prompt are required",
      });
    }

    // ==========================================
    // 2. Find existing project
    // ==========================================

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // ==========================================
    // 3. Get selected technology stack
    // ==========================================

    const techStack = project.techStack || [];

    console.log(
      "Project:",
      project.name
    );

    console.log(
      "Selected Tech Stack:",
      techStack
    );

    console.log(
      "Application Requirements:",
      prompt
    );

    // ==========================================
    // 4. Generate Application
    // ==========================================

    const result = await generateApp(
      prompt,
      techStack
    );

    // ==========================================
    // 5. Stop if validation failed
    // ==========================================

    if (
      result.validation &&
      !result.validation.valid
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Generated project validation failed",
        validation: result.validation,
      });
    }

    // ==========================================
    // 6. Generate and format actual project files
    // ==========================================

    const {
      projectRoot,
      formattedFiles,
    } = await generateProjectFiles(
      projectId,
      result.files
    );

    // ==========================================
    // 7. Save generated data into MongoDB
    // ==========================================

    project.name = result.projectName;

    project.description =
      result.description;

    project.techStack =
      result.techStack;

    project.files =
      formattedFiles;

    // ==========================================
    // 8. Update project status
    // ==========================================

    project.status = "generated";

    await project.save();

    // ==========================================
    // 9. Send response
    // ==========================================

    return res.status(200).json({
      success: true,

      message:
        "Application generated successfully",

      projectId: project._id,

      projectPath: projectRoot,

      validation:
        result.validation,

      result: {
        projectName:
          result.projectName,

        description:
          result.description,

        techStack:
          result.techStack,

        files:
          formattedFiles,
      },
    });
  } catch (error) {
    console.error(
      "Generation Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to generate application",
      error: error.message,
    });
  }
};
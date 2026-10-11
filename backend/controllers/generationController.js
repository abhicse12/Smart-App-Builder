import generateApp from "../services/generationService.js";
import generateProjectFiles from "../services/fileGenerationService.js";
import modifyProject from "../services/modifyProjectService.js";
import Project from "../models/Project.js";

export const generateProject = async (req, res) => {
  try {
    const {
      projectId,
      prompt,
      mode = "generate",
    } = req.body;

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

    const techStack = project.techStack || [];

    console.log("\n=================================");
    console.log("Project:", project.name);
    console.log("Mode:", mode);
    console.log("Tech Stack:", techStack);
    console.log("User Request:", prompt);
    console.log("=================================\n");

    // ==========================================
    // 3. MODIFY EXISTING PROJECT
    // ==========================================

    if (mode === "modify") {
      console.log("✏️ Modifying existing project...");

      const result = await modifyProject({
        projectName: project.name,
        description: project.description || "",
        techStack,
        files: project.files || [],
        userRequest: prompt,
      });

      if (
        !result ||
        !Array.isArray(result.files)
      ) {
        return res.status(500).json({
          success: false,
          message: "Invalid modification response from AI",
        });
      }

      console.log(
        "Modified files:",
        result.files.map((file) => file.path)
      );

      // ==========================================
      // Merge modified files with existing files
      // ==========================================

      const fileMap = new Map(
        (project.files || []).map((file) => [
          file.path,
          file,
        ])
      );

      for (const modifiedFile of result.files) {
        fileMap.set(
          modifiedFile.path,
          modifiedFile
        );
      }

      const updatedFiles =
        Array.from(fileMap.values());

      // ==========================================
      // Write modified files to disk
      // ==========================================

      console.log(
        "📁 Writing modified files to disk..."
      );

      const projectFilesResult =
        await generateProjectFiles(
          projectId,
          updatedFiles
        );

      console.log(
        "✅ Modified files written to disk"
      );

      console.log(
        "Project root:",
        projectFilesResult.projectRoot
      );

      // ==========================================
      // Save updated project
      // ==========================================

      project.files =
        projectFilesResult.formattedFiles;

      project.status = "modified";

      await project.save();

      console.log(
        "✅ Existing project modified successfully"
      );

      // ==========================================
      // Response
      // ==========================================

      return res.status(200).json({
        success: true,

        message:
          "Project modified successfully",

        projectId: project._id,

        modifiedFiles:
          result.files.map(
            (file) => file.path
          ),

        projectPath:
          projectFilesResult.projectRoot,

        result: {
          projectName: project.name,
          description: project.description,
          techStack: project.techStack,
          files:
            projectFilesResult.formattedFiles,
        },
      });
    }

    // ==========================================
    // 4. NEW / NORMAL GENERATION
    // ==========================================

    console.log("🚀 Generating application...");

    const result = await generateApp(
      prompt,
      techStack,
      projectId
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

        validation:
          result.validation,

        runtimeValidation:
          result.runtimeValidation,
      });
    }

    // ==========================================
    // 6. Save generated project
    // ==========================================

    project.name =
      result.projectName;

    project.description =
      result.description;

    project.techStack =
      result.techStack;

    project.files =
      result.formattedFiles;

    // ==========================================
    // 7. Update project status
    // ==========================================

    if (
      result.runtimeValidation &&
      result.runtimeValidation.success
    ) {
      project.status = "verified";
    } else {
      project.status = "generated";
    }

    await project.save();

    // ==========================================
    // 8. Response
    // ==========================================

    return res.status(200).json({
      success: true,

      message:
        result.runtimeValidation?.success
          ? "Application generated and runtime verified successfully"
          : "Application generated successfully, but runtime validation failed",

      projectId: project._id,

      projectPath:
        result.projectRoot,

      validation:
        result.validation,

      runtimeValidation:
        result.runtimeValidation,

      result: {
        projectName:
          result.projectName,

        description:
          result.description,

        techStack:
          result.techStack,

        files:
          result.formattedFiles,
      },
    });

  } catch (error) {
    console.error(
      "Generation/Modification Error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to process application",

      error:
        error.message,
    });
  }
};
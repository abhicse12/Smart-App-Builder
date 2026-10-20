import Project from "../models/Project.js";
import modifyProjectService from "../services/modifyProjectService.js";

import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { ZipArchive } from "archiver";

import runProjectInDocker, {
  stopProject,
} from "../services/runnerService.js";

import writeProjectFiles from "../services/writeProjectFiles.js";
import modifyValidatorService from "../services/modifyValidatorService.js";
import fixProject from "../services/fixerService.js";
import syncProjectFiles from "../services/syncProjectFiles.js";
import { errorDetails } from "../utils/errorResponse.js";

// ======================================================
// CREATE PROJECT
// ======================================================

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_TECH_ITEMS = 20;
const MAX_TECH_LENGTH = 50;

// Validates the client-supplied project fields.
// Returns { fields } or { error }.
const validateNewProject = (body = {}) => {
  const { name, description = "", techStack = [] } = body;

  if (typeof name !== "string" || !name.trim()) {
    return { error: "Project name is required" };
  }

  if (name.trim().length > MAX_NAME_LENGTH) {
    return {
      error: `Project name must be at most ${MAX_NAME_LENGTH} characters`,
    };
  }

  if (
    typeof description !== "string" ||
    description.length > MAX_DESCRIPTION_LENGTH
  ) {
    return {
      error: `Description must be text of at most ${MAX_DESCRIPTION_LENGTH} characters`,
    };
  }

  if (
    !Array.isArray(techStack) ||
    techStack.length > MAX_TECH_ITEMS ||
    techStack.some(
      (tech) =>
        typeof tech !== "string" ||
        !tech.trim() ||
        tech.trim().length > MAX_TECH_LENGTH
    )
  ) {
    return {
      error: `Tech stack must be a list of up to ${MAX_TECH_ITEMS} technology names`,
    };
  }

  return {
    fields: {
      name: name.trim(),
      description: description.trim(),
      techStack: [
        ...new Set(techStack.map((tech) => tech.trim())),
      ],
    },
  };
};

export const createProject = async (req, res) => {
  try {
    const { fields, error } = validateNewProject(
      req.body ?? {}
    );

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    // status is never taken from the client; new projects
    // always start as "active" (the schema default)
    const project = await Project.create({
      user: req.user.userId,
      ...fields,
    });

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to create project",
      ...errorDetails(error),
    });
  }
};

// ======================================================
// GET ALL PROJECTS
// ======================================================

export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      user: req.user.userId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("Get Projects Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch projects",
      ...errorDetails(error),
    });
  }
};

// ======================================================
// GET PROJECT BY ID
// ======================================================

export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    console.error("Get Project By ID Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch project",
      ...errorDetails(error),
    });
  }
};

// ======================================================
// GET PROJECT FILES
// ======================================================

export const getProjectFiles = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findOne({
      _id: id,
      user: req.user.userId,
    }).select("name files");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.status(200).json({
      success: true,
      projectId: project._id,
      projectName: project.name,
      files: project.files || [],
    });
  } catch (error) {
    console.error("Get Project Files Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch project files",
      ...errorDetails(error),
    });
  }
};

// ======================================================
// DOWNLOAD PROJECT
// ======================================================

export const downloadProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findOne({
      _id: id,
      user: req.user.userId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const projectPath = path.join(
      process.cwd(),
      "generated-projects",
      id.toString()
    );

    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({
        success: false,
        message: "Generated project files not found",
      });
    }

    res.attachment(
      `${project.name || "generated-project"}.zip`
    );

    const archive = new ZipArchive({
      zlib: { level: 9 },
    });

    archive.on("error", (error) => {
      console.error("Archive Error:", error);
      res.destroy(error);
    });

    archive.pipe(res);

    archive.directory(projectPath, false);

    await archive.finalize();
  } catch (error) {
    console.error("Download Project Error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to download project",
        ...errorDetails(error),
      });
    }
  }
};

// ======================================================
// RUN PROJECT
// ======================================================

export const runProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findOne({
      _id: id,
      user: req.user.userId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const projectPath = path.join(
      process.cwd(),
      "generated-projects",
      id.toString()
    );

    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({
        success: false,
        message: "Generated project files not found",
      });
    }

    console.log(
      `Starting Runner Agent for project: ${id}`
    );

    // =====================================
    // Runtime Auto-Fixer
    // =====================================

    const MAX_RUNTIME_FIX_ATTEMPTS = 3;

    let runtimeFixAttempt = 0;
    let runnerResult = null;

    while (
      runtimeFixAttempt < MAX_RUNTIME_FIX_ATTEMPTS
    ) {
      try {
        runtimeFixAttempt++;

        console.log(
          `🚀 Running project attempt ${runtimeFixAttempt}/${MAX_RUNTIME_FIX_ATTEMPTS}`
        );

        runnerResult =
          await runProjectInDocker(id);

        console.log(
          "✅ Project started successfully."
        );

        return res.status(200).json({
          success: true,
          message:
            runtimeFixAttempt === 1
              ? "Project started successfully"
              : "Project fixed and started successfully",
          projectId: project._id,
          runner: runnerResult,
          runtimeFixAttempts:
            runtimeFixAttempt - 1,
        });
      } catch (error) {
        console.error(
          `❌ Runtime Error on attempt ${runtimeFixAttempt}:`,
          error.message
        );

        // No more attempts
        if (
          runtimeFixAttempt >=
          MAX_RUNTIME_FIX_ATTEMPTS
        ) {
          throw error;
        }

        console.log(
          "🔧 Starting Runtime Fixer..."
        );

        // =====================================
        // Parse Runtime Error
        // =====================================

        let runtimeError;

        try {
          runtimeError = JSON.parse(
            error.message
          );
        } catch {
          runtimeError = {
            type: "RUNTIME_ERROR",
            message: error.message,
          };
        }

        // =====================================
        // Sync current disk files to MongoDB
        // =====================================

        await syncProjectFiles(id);

        // Get latest project from MongoDB
        const latestProject =
          await Project.findById(id);

        if (!latestProject) {
          throw new Error(
            "Project not found while running Runtime Fixer"
          );
        }

        // =====================================
        // Call Runtime Fixer
        // =====================================

        const fixedProject =
          await fixProject({
            projectName:
              latestProject.name,

            description:
              latestProject.description || "",

            techStack:
              latestProject.techStack || [],

            errors: [runtimeError],

            files:
              latestProject.files || [],
          });

        if (
          !fixedProject ||
          !Array.isArray(
            fixedProject.files
          )
        ) {
          throw new Error(
            "Runtime Fixer returned invalid response"
          );
        }

        console.log(
          "🛠 Runtime Fixer modified files:",
          fixedProject.files.map(
            (file) => file.path
          )
        );

        // =====================================
        // Update MongoDB
        // =====================================

        const existingFiles = new Map(
          (
            latestProject.files || []
          ).map((file) => [
            file.path,
            file.content,
          ])
        );

        for (const file of fixedProject.files) {
          if (
            !file.path ||
            typeof file.content !==
              "string"
          ) {
            continue;
          }

          existingFiles.set(
            file.path,
            file.content
          );
        }

        latestProject.files =
          Array.from(
            existingFiles,
            ([filePath, content]) => ({
              path: filePath,
              content,
            })
          );

        await latestProject.save();

        // =====================================
        // Write Fixed Files to Disk
        // =====================================

        await writeProjectFiles(
          id,
          fixedProject.files
        );

        console.log(
          "✅ Runtime Fixer changes written to disk."
        );
      }
    }
  } catch (error) {
    console.error(
      "Run Project Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to run project",
      ...errorDetails(error),
    });
  }
};

// ======================================================
// DELETE PROJECT
// ======================================================

export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    // Find project
    const project = await Project.findOne({
      _id: id,
      user: req.user.userId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // =====================================
    // Delete generated project from disk
    // =====================================

    const generatedProjectsRoot = path.resolve(
      process.cwd(),
      "generated-projects"
    );

    const projectRoot = path.resolve(
      generatedProjectsRoot,
      id.toString()
    );

    // Security check
    if (
      projectRoot === generatedProjectsRoot ||
      !projectRoot.startsWith(
        generatedProjectsRoot + path.sep
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid project path",
      });
    }

    // Stop and remove the project's Docker container (and its
    // node_modules volumes) before deleting the mounted folder.
    // stopProject ignores "container not running".
    await stopProject(id);

    try {
      await fsPromises.rm(projectRoot, {
        recursive: true,
        force: true,
      });
    } catch (fileError) {
      console.error(
        "Generated project deletion error:",
        fileError
      );
    }

    // =====================================
    // Delete project from MongoDB
    // =====================================

    await Project.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Project deleted successfully",
      projectId: id,
    });
  } catch (error) {
    console.error(
      "Delete Project Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete project",
      ...errorDetails(error),
    });
  }
};

// ======================================================
// MODIFY PROJECT
// ======================================================

export const modifyProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { userRequest } = req.body;

    if (!userRequest) {
      return res.status(400).json({
        success: false,
        message: "Modification request is required",
      });
    }

    const project = await Project.findOne({
      _id: id,
      user: req.user.userId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    console.log(`Modifying project: ${id}`);
    console.log(`User request: ${userRequest}`);

    // ==================================================
    // SEND EXISTING PROJECT TO AI
    // ==================================================

    const modifiedProject =
      await modifyProjectService({
        projectName: project.name,
        description: project.description || "",
        techStack: project.techStack || [],
        files: project.files || [],
        userRequest,
      });

    if (
      !modifiedProject ||
      !Array.isArray(modifiedProject.files)
    ) {
      throw new Error(
        "AI returned an invalid modification response"
      );
    }

    // ==================================================
    // PROTECTED FILES
    // ==================================================

    const protectedFiles = new Set([
      "package.json",
      "package-lock.json",
      "npm-shrinkwrap.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "vite.config.js",
      "vite.config.ts",
      "tsconfig.json",
      "eslint.config.js",
      ".eslintrc",
      "tailwind.config.js",
      "postcss.config.js",
      "Dockerfile",
      "docker-compose.yml",
      ".env",
    ]);

    // ==================================================
    // CHECK WHETHER A FILE IS PROTECTED
    // ==================================================

    const isProtectedPath = (filePath) => {
      const normalizedPath = filePath.replace(
        /\\/g,
        "/"
      );

      const fileName =
        normalizedPath.split("/").pop();

      return protectedFiles.has(fileName);
    };

    // ==================================================
    // FILTER AI FILES
    // ==================================================

    const allowedModifiedFiles =
      modifiedProject.files.filter(
        (file) => !isProtectedPath(file.path)
      );

    console.log(
      "AI returned files:",
      modifiedProject.files.map(
        (file) => file.path
      )
    );

    console.log(
      "Allowed modified files:",
      allowedModifiedFiles.map(
        (file) => file.path
      )
    );

    // ==================================================
    // UPDATE ONLY ALLOWED FILES
    // ==================================================

    const modifiedFilesMap = new Map(
      allowedModifiedFiles.map((file) => [
        file.path,
        file.content,
      ])
    );

    const existingPaths = new Set(
      project.files.map((file) => file.path)
    );

    // ==================================================
    // UPDATE EXISTING FILES
    // ==================================================

    project.files = project.files.map((file) => {
      if (modifiedFilesMap.has(file.path)) {
        return {
          path: file.path,
          content: modifiedFilesMap.get(
            file.path
          ),
        };
      }

      return file;
    });

    // ==================================================
    // ADD NEW FILES
    // ==================================================

    for (const file of allowedModifiedFiles) {
      if (!existingPaths.has(file.path)) {
        project.files.push({
          path: file.path,
          content: file.content,
        });
      }
    }

    // ==================================================
    // SAVE TO MONGODB
    // ==================================================

    await project.save();

    // ==================================================
    // WRITE FILES TO DISK
    // ==================================================

    await writeProjectFiles(
      project._id,
      project.files
    );

    console.log(
      "Modified files written to disk"
    );

    console.log(
      "Modified files saved to MongoDB"
    );

    // ==================================================
    // VALIDATE PROJECT
    // ==================================================

    const validationResult =
      await modifyValidatorService(
        project._id
      );

    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        message:
          "Modified project validation failed",
        errors: validationResult.errors,
      });
    }

    console.log(
      "Modified project validation passed"
    );

    // ==================================================
    // STOP EXISTING CONTAINER
    // ==================================================

    await stopProject(project._id);

    // ==================================================
    // START UPDATED PROJECT
    // ==================================================

    const runnerResult =
      await runProjectInDocker(
        project._id
      );

    console.log(
      "Updated project started successfully"
    );

    // ==================================================
    // RESPONSE
    // ==================================================

    return res.status(200).json({
      success: true,
      message:
        "Project modified and restarted successfully",

      projectId: project._id,

      modifiedFiles:
        allowedModifiedFiles.map(
          (file) => file.path
        ),

      validation: validationResult,

      runner: runnerResult,
    });
  } catch (error) {
    console.error(
      "Modify Project Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to modify project",
      ...errorDetails(error),
    });
  }
};
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

// ======================================================
// CREATE PROJECT
// ======================================================

export const createProject = async (req, res) => {
  try {
    const { name, description, techStack, status } = req.body;

    const project = await Project.create({
      name,
      description,
      techStack,
      status,
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
      error: error.message,
    });
  }
};

// ======================================================
// GET ALL PROJECTS
// ======================================================

export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("Get Projects Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch projects",
      error: error.message,
    });
  }
};

// ======================================================
// GET PROJECT BY ID
// ======================================================

export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

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
      error: error.message,
    });
  }
};

// ======================================================
// GET PROJECT FILES
// ======================================================

export const getProjectFiles = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id).select(
      "name files"
    );

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
      error: error.message,
    });
  }
};

// ======================================================
// DOWNLOAD PROJECT
// ======================================================

export const downloadProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id);

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
        error: error.message,
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

    const project = await Project.findById(id);

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

    const runnerResult =
      await runProjectInDocker(id);

    return res.status(200).json({
      success: true,
      message: "Project started successfully",
      projectId: project._id,
      runner: runnerResult,
    });
  } catch (error) {
    console.error("Run Project Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to run project",
      error: error.message,
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
    const project = await Project.findById(id);

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
      error: error.message,
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

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // ==================================================
    // TEMPORARY PACKAGE DEBUG
    // ==================================================

    const storedPackage = project.files.find(
      (file) =>
        file.path === "frontend/package.json"
    );

    console.log(
      "PACKAGE.JSON FROM MONGODB:",
      storedPackage?.content
    );

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
      error: error.message,
    });
  }
};
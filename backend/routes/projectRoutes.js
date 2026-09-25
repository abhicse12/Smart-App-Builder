import express from "express";

import {
  createProject,
  getProjects,
  getProjectById,
  getProjectFiles,
  downloadProject,
  runProject,
  deleteProject,
} from "../controllers/projectController.js";

const router = express.Router();

router.post("/", createProject);

router.get("/", getProjects);

router.delete("/:id", deleteProject);

router.get("/:id/files", getProjectFiles);

router.get("/:id/download", downloadProject);

router.post("/:id/run", runProject);

router.get("/:id", getProjectById);

export default router;
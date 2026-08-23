import express from "express";

import {
  createProject,
  getProjects,
  getProjectById,
  getProjectFiles,
} from "../controllers/projectController.js";

const router = express.Router();

router.post("/", createProject);

router.get("/", getProjects);

router.get("/:id/files", getProjectFiles);

router.get("/:id", getProjectById);

export default router;
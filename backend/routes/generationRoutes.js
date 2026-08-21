import express from "express";
import { generateProject } from "../controllers/generationController.js";

const router = express.Router();

router.post("/", generateProject);

export default router;
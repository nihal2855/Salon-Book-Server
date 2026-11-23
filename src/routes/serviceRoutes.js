import express from "express";
import { verifyJWT, verifyAdmin } from "../middlewares/authMiddleware.js";
import {
    getActiveServices,
    getServiceById,
    getAllServicesAdmin,
    createService,
    updateService,
    deleteService,
} from "../controllers/serviceController.js";

const router = express.Router();

// Admin routes (must be placed before /:id to avoid route collision)
router.get("/admin/all", verifyJWT, verifyAdmin, getAllServicesAdmin);
router.post("/", verifyJWT, verifyAdmin, createService);
router.patch("/:id", verifyJWT, verifyAdmin, updateService);
router.delete("/:id", verifyJWT, verifyAdmin, deleteService);

// Public routes
router.get("/", getActiveServices);
router.get("/:id", getServiceById);

export default router;
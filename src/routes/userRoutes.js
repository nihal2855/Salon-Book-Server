import express from "express";
import { verifyJWT, verifyAdmin } from "../middlewares/authMiddleware.js";
import {
    getCurrentUser,
    updateMyProfile,
    getAllCustomersAdmin,
    getUserDetailsAdmin,
    updateUserBlockStatusAdmin,
} from "../controllers/userController.js";

const router = express.Router();

// Authenticated User Profile Routes
router.get("/me", verifyJWT, getCurrentUser);
router.patch("/me", verifyJWT, updateMyProfile);

// Admin User Management Routes
router.get("/admin/customers", verifyJWT, verifyAdmin, getAllCustomersAdmin);
router.get("/admin/:id", verifyJWT, verifyAdmin, getUserDetailsAdmin);
router.patch("/admin/:id/block", verifyJWT, verifyAdmin, updateUserBlockStatusAdmin);

export default router;
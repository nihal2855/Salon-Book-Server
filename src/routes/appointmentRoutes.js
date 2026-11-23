import express from "express";
import { verifyJWT, verifyAdmin } from "../middlewares/authMiddleware.js";
import {
    createAppointment,
    getMyAppointments,
    cancelMyAppointment,
    getAllAppointmentsAdmin,
    updateAppointmentStatusAdmin,
    getCustomerStats,
    getAdminStats,
} from "../controllers/appointmentController.js";

const router = express.Router();

// Customer routes
router.post("/", verifyJWT, createAppointment);
router.get("/my", verifyJWT, getMyAppointments);
router.get("/stats/customer", verifyJWT, getCustomerStats);
router.patch("/:id/cancel", verifyJWT, cancelMyAppointment);

// Admin routes
router.get("/admin/all", verifyJWT, verifyAdmin, getAllAppointmentsAdmin);
router.get("/stats/admin", verifyJWT, verifyAdmin, getAdminStats);
router.patch("/:id/status", verifyJWT, verifyAdmin, updateAppointmentStatusAdmin);

export default router;
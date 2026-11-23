import express from "express";
import { verifyJWT, verifyAdmin } from "../middlewares/authMiddleware.js";
import {
    createCheckoutSession,
    handleStripeWebhook,
    getMyTransactions,
    getAllTransactionsAdmin,
} from "../controllers/paymentController.js";

const router = express.Router();

// Stripe Webhook Endpoint (verified via Stripe signature)
router.post("/webhook", handleStripeWebhook);

// Customer Payment Routes
router.post("/create-checkout-session", verifyJWT, createCheckoutSession);
router.get("/my", verifyJWT, getMyTransactions);

// Admin Read-Only Transactions Route
router.get("/admin/all", verifyJWT, verifyAdmin, getAllTransactionsAdmin);

export default router;
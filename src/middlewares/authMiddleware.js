import jwt from "jsonwebtoken";
import { collections } from "../config/db.js";

export async function verifyJWT(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Missing or invalid authorization token.",
            });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await collections.users.findOne({ email: decoded.email });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User account not found.",
            });
        }

        if (user.isBlocked) {
            return res.status(403).json({
                success: false,
                message: "Access denied: Your account has been blocked by an administrator.",
            });
        }

        req.user = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            image: user.image || "",
            phone: user.phone || "",
            role: user.role || "customer",
            isBlocked: Boolean(user.isBlocked),
        };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized: Invalid or expired token.",
        });
    }
}

export function verifyAdmin(req, res, next) {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Forbidden: Administrator privileges required.",
        });
    }
    next();
}
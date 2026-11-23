import { ObjectId } from "mongodb";
import { collections, connectDB } from "../config/db.js";

export async function getCurrentUser(req, res, next) {
    try {
        res.status(200).json({
            success: true,
            user: req.user,
        });
    } catch (error) {
        next(error);
    }
}

export async function updateMyProfile(req, res, next) {
    try {
        const { name, image, phone } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Name is required.",
            });
        }

        const updateFields = {
            name: name.trim(),
            updatedAt: new Date(),
        };

        if (typeof image === "string") {
            updateFields.image = image.trim();
        }

        if (typeof phone === "string") {
            updateFields.phone = phone.trim();
        }

        await collections.users.updateOne(
            { email: req.user.email },
            { $set: updateFields }
        );

        const updatedUser = await collections.users.findOne({ email: req.user.email });

        res.status(200).json({
            success: true,
            message: "Profile updated successfully.",
            user: {
                id: updatedUser._id.toString(),
                name: updatedUser.name,
                email: updatedUser.email,
                image: updatedUser.image || "",
                phone: updatedUser.phone || "",
                role: updatedUser.role || "customer",
                isBlocked: Boolean(updatedUser.isBlocked),
            },
        });
    } catch (error) {
        next(error);
    }
}

// Admin: Get all registered customers
export async function getAllCustomersAdmin(req, res, next) {
    try {
        const customers = await collections.users
            .find({ role: "customer" })
            .project({ password: 0 })
            .sort({ createdAt: -1 })
            .toArray();

        res.status(200).json({
            success: true,
            count: customers.length,
            customers,
        });
    } catch (error) {
        next(error);
    }
}

// Admin: Get single user details with appointment count
export async function getUserDetailsAdmin(req, res, next) {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID format.",
            });
        }

        const user = await collections.users.findOne(
            { _id: new ObjectId(id) },
            { projection: { password: 0 } }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        const appointmentCount = await collections.appointments.countDocuments({
            customerId: new ObjectId(id),
        });

        res.status(200).json({
            success: true,
            user: {
                ...user,
                appointmentCount,
            },
        });
    } catch (error) {
        next(error);
    }
}

// Admin: Block or Unblock a customer
export async function updateUserBlockStatusAdmin(req, res, next) {
    try {
        const { id } = req.params;
        const { isBlocked } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID format.",
            });
        }

        if (typeof isBlocked !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "isBlocked must be a boolean value.",
            });
        }

        if (id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: "You cannot block your own administrator account.",
            });
        }

        const targetUser = await collections.users.findOne({ _id: new ObjectId(id) });

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        if (targetUser.role === "admin") {
            return res.status(403).json({
                success: false,
                message: "Administrator accounts cannot be blocked.",
            });
        }

        await collections.users.updateOne(
            { _id: new ObjectId(id) },
            { $set: { isBlocked, updatedAt: new Date() } }
        );

        // Revoke active Better Auth sessions immediately when blocking a user
        if (isBlocked) {
            const { db } = await connectDB();
            await db.collection("session").deleteMany({
                $or: [{ userId: new ObjectId(id) }, { userId: id }],
            });
        }

        res.status(200).json({
            success: true,
            message: isBlocked
                ? "Customer account has been blocked."
                : "Customer account has been unblocked.",
        });
    } catch (error) {
        next(error);
    }
}
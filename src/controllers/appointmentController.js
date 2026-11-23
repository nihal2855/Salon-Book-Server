import { ObjectId } from "mongodb";
import { collections } from "../config/db.js";

// Customer: Create a new appointment request
export async function createAppointment(req, res, next) {
    try {
        if (req.user.role !== "customer") {
            return res.status(403).json({
                success: false,
                message: "Only customers can submit appointment requests.",
            });
        }

        const { serviceId, appointmentDate, timeSlot, message = "" } = req.body;

        if (!serviceId || !ObjectId.isValid(serviceId)) {
            return res.status(400).json({
                success: false,
                message: "Valid service ID is required.",
            });
        }

        if (!appointmentDate || !appointmentDate.trim()) {
            return res.status(400).json({
                success: false,
                message: "Appointment date is required.",
            });
        }

        if (!timeSlot || !timeSlot.trim()) {
            return res.status(400).json({
                success: false,
                message: "Time slot is required.",
            });
        }

        const service = await collections.services.findOne({
            _id: new ObjectId(serviceId),
        });

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Salon service not found.",
            });
        }

        if (service.status !== "active") {
            return res.status(400).json({
                success: false,
                message: "This service is currently inactive and cannot be booked.",
            });
        }

        // Prevent duplicate active appointments for the same date and time slot
        const existingConflict = await collections.appointments.findOne({
            appointmentDate: appointmentDate.trim(),
            timeSlot: timeSlot.trim(),
            status: { $in: ["pending", "confirmed"] },
        });

        if (existingConflict) {
            return res.status(409).json({
                success: false,
                message:
                    "This date and time slot is already reserved. Please select a different slot.",
            });
        }

        const newAppointment = {
            serviceId: new ObjectId(serviceId),
            customerId: new ObjectId(req.user.id),
            appointmentDate: appointmentDate.trim(),
            timeSlot: timeSlot.trim(),
            message: message.trim(),
            servicePrice: Number(service.price),
            paymentStatus: "unpaid",
            status: "pending",
            createdAt: new Date(),
        };

        const result = await collections.appointments.insertOne(newAppointment);

        res.status(201).json({
            success: true,
            message: "Appointment request submitted successfully.",
            appointment: {
                _id: result.insertedId,
                ...newAppointment,
            },
        });
    } catch (error) {
        next(error);
    }
}

// Customer: Get logged-in customer's own appointments with service info
export async function getMyAppointments(req, res, next) {
    try {
        const customerObjectId = new ObjectId(req.user.id);

        const appointments = await collections.appointments
            .aggregate([
                { $match: { customerId: customerObjectId } },
                { $sort: { createdAt: -1 } },
                {
                    $lookup: {
                        from: "services",
                        localField: "serviceId",
                        foreignField: "_id",
                        as: "service",
                    },
                },
                {
                    $unwind: {
                        path: "$service",
                        preserveNullAndEmptyArrays: true,
                    },
                },
            ])
            .toArray();

        res.status(200).json({
            success: true,
            count: appointments.length,
            appointments,
        });
    } catch (error) {
        next(error);
    }
}

// Customer: Cancel own pending appointment
export async function cancelMyAppointment(req, res, next) {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid appointment ID.",
            });
        }

        const appointment = await collections.appointments.findOne({
            _id: new ObjectId(id),
            customerId: new ObjectId(req.user.id),
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found.",
            });
        }

        if (appointment.status !== "pending") {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel an appointment that is already ${appointment.status}.`,
            });
        }

        await collections.appointments.updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: "cancelled", updatedAt: new Date() } }
        );

        res.status(200).json({
            success: true,
            message: "Appointment cancelled successfully.",
        });
    } catch (error) {
        next(error);
    }
}

// Admin: Get all appointments joined with customer and service details
export async function getAllAppointmentsAdmin(req, res, next) {
    try {
        const appointments = await collections.appointments
            .aggregate([
                { $sort: { createdAt: -1 } },
                {
                    $lookup: {
                        from: "services",
                        localField: "serviceId",
                        foreignField: "_id",
                        as: "service",
                    },
                },
                {
                    $unwind: {
                        path: "$service",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "customerId",
                        foreignField: "_id",
                        as: "customer",
                    },
                },
                {
                    $unwind: {
                        path: "$customer",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $project: {
                        "customer.password": 0,
                    },
                },
            ])
            .toArray();

        res.status(200).json({
            success: true,
            count: appointments.length,
            appointments,
        });
    } catch (error) {
        next(error);
    }
}

// Admin: Confirm pending appointment or cancel pending/confirmed appointment
export async function updateAppointmentStatusAdmin(req, res, next) {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid appointment ID.",
            });
        }

        if (status !== "confirmed" && status !== "cancelled") {
            return res.status(400).json({
                success: false,
                message: "Status must be either 'confirmed' or 'cancelled'.",
            });
        }

        const appointment = await collections.appointments.findOne({
            _id: new ObjectId(id),
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found.",
            });
        }

        if (status === "confirmed" && appointment.status !== "pending") {
            return res.status(400).json({
                success: false,
                message: "Only pending appointments can be confirmed.",
            });
        }

        if (
            status === "cancelled" &&
            appointment.status !== "pending" &&
            appointment.status !== "confirmed"
        ) {
            return res.status(400).json({
                success: false,
                message: "Only pending or confirmed appointments can be cancelled.",
            });
        }

        await collections.appointments.updateOne(
            { _id: new ObjectId(id) },
            { $set: { status, updatedAt: new Date() } }
        );

        res.status(200).json({
            success: true,
            message: `Appointment ${status} successfully.`,
        });
    } catch (error) {
        next(error);
    }
}

// Customer Dashboard Overview Stats
export async function getCustomerStats(req, res, next) {
    try {
        const customerId = new ObjectId(req.user.id);

        const [total, pending, confirmed, cancelled] = await Promise.all([
            collections.appointments.countDocuments({ customerId }),
            collections.appointments.countDocuments({ customerId, status: "pending" }),
            collections.appointments.countDocuments({ customerId, status: "confirmed" }),
            collections.appointments.countDocuments({ customerId, status: "cancelled" }),
        ]);

        res.status(200).json({
            success: true,
            stats: {
                totalAppointments: total,
                pendingAppointments: pending,
                confirmedAppointments: confirmed,
                cancelledAppointments: cancelled,
            },
        });
    } catch (error) {
        next(error);
    }
}

// Admin Dashboard Overview Stats
export async function getAdminStats(req, res, next) {
    try {
        const [
            totalCustomers,
            totalActiveServices,
            totalAppointments,
            pendingAppointments,
            confirmedAppointments,
            totalSuccessfulPayments,
        ] = await Promise.all([
            collections.users.countDocuments({ role: "customer" }),
            collections.services.countDocuments({ status: "active" }),
            collections.appointments.countDocuments({}),
            collections.appointments.countDocuments({ status: "pending" }),
            collections.appointments.countDocuments({ status: "confirmed" }),
            collections.transactions.countDocuments({ status: "paid" }),
        ]);

        res.status(200).json({
            success: true,
            stats: {
                totalCustomers,
                totalActiveServices,
                totalAppointments,
                pendingAppointments,
                confirmedAppointments,
                totalSuccessfulPayments,
            },
        });
    } catch (error) {
        next(error);
    }
}
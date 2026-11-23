import Stripe from "stripe";
import { ObjectId } from "mongodb";
import { collections } from "../config/db.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Customer: Create a Stripe Checkout Session for a confirmed appointment
export async function createCheckoutSession(req, res, next) {
    try {
        if (req.user.role !== "customer") {
            return res.status(403).json({
                success: false,
                message: "Only customer accounts can initiate appointment payments.",
            });
        }

        const { appointmentId } = req.body;

        if (!appointmentId || !ObjectId.isValid(appointmentId)) {
            return res.status(400).json({
                success: false,
                message: "Valid appointment ID is required.",
            });
        }

        const appointment = await collections.appointments.findOne({
            _id: new ObjectId(appointmentId),
            customerId: new ObjectId(req.user.id),
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found.",
            });
        }

        if (appointment.status !== "confirmed") {
            return res.status(400).json({
                success: false,
                message:
                    "Payment is only allowed after an administrator confirms your appointment.",
            });
        }

        if (appointment.paymentStatus === "paid") {
            return res.status(400).json({
                success: false,
                message: "This appointment has already been paid.",
            });
        }

        const service = await collections.services.findOne({
            _id: new ObjectId(appointment.serviceId),
        });

        const serviceName = service?.serviceName || "SalonBook Appointment";
        const unitAmountInCents = Math.round(Number(appointment.servicePrice) * 100);

        if (unitAmountInCents <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid appointment payment amount.",
            });
        }

        const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            customer_email: req.user.email,
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: serviceName,
                            description: `Appointment on ${appointment.appointmentDate} (${appointment.timeSlot})`,
                            images: service?.image ? [service.image] : [],
                        },
                        unit_amount: unitAmountInCents,
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                appointmentId: appointment._id.toString(),
                customerId: req.user.id,
                serviceId: appointment.serviceId.toString(),
            },
            success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${clientUrl}/payment/cancel?appointment_id=${appointment._id.toString()}`,
        });

        res.status(200).json({
            success: true,
            url: session.url,
            sessionId: session.id,
        });
    } catch (error) {
        next(error);
    }
}

// Stripe Webhook: Verified event handler to update payment status & save transaction
export async function handleStripeWebhook(req, res) {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
        return res.status(400).json({
            success: false,
            message: "Missing Stripe signature or webhook secret.",
        });
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err) {
        console.error("Stripe Webhook Signature Verification Failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        if (event.type === "checkout.session.completed") {
            const session = event.data.object;
            const appointmentId = session.metadata?.appointmentId;
            const customerId = session.metadata?.customerId;

            if (
                appointmentId &&
                customerId &&
                ObjectId.isValid(appointmentId) &&
                ObjectId.isValid(customerId)
            ) {
                // Idempotency check: avoid duplicate inserts on webhook retries
                const existingTx = await collections.transactions.findOne({
                    stripeSessionId: session.id,
                });

                if (!existingTx) {
                    await collections.appointments.updateOne(
                        { _id: new ObjectId(appointmentId) },
                        {
                            $set: {
                                paymentStatus: "paid",
                                updatedAt: new Date(),
                            },
                        }
                    );

                    await collections.transactions.insertOne({
                        appointmentId: new ObjectId(appointmentId),
                        customerId: new ObjectId(customerId),
                        amount: session.amount_total ? session.amount_total / 100 : 0,
                        currency: (session.currency || "usd").toUpperCase(),
                        stripeSessionId: session.id,
                        status: "paid",
                        createdAt: new Date(),
                    });
                }
            }
        } else if (event.type === "checkout.session.expired") {
            const session = event.data.object;
            const appointmentId = session.metadata?.appointmentId;
            const customerId = session.metadata?.customerId;

            if (
                appointmentId &&
                customerId &&
                ObjectId.isValid(appointmentId) &&
                ObjectId.isValid(customerId)
            ) {
                const existingTx = await collections.transactions.findOne({
                    stripeSessionId: session.id,
                });

                if (!existingTx) {
                    await collections.transactions.insertOne({
                        appointmentId: new ObjectId(appointmentId),
                        customerId: new ObjectId(customerId),
                        amount: session.amount_total ? session.amount_total / 100 : 0,
                        currency: (session.currency || "usd").toUpperCase(),
                        stripeSessionId: session.id,
                        status: "failed",
                        createdAt: new Date(),
                    });
                }
            }
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error("Error processing Stripe webhook event:", error);
        res.status(500).json({
            success: false,
            message: "Webhook handler failed.",
        });
    }
}

// Customer: Get logged-in customer's payment history
export async function getMyTransactions(req, res, next) {
    try {
        const customerId = new ObjectId(req.user.id);

        const transactions = await collections.transactions
            .aggregate([
                { $match: { customerId } },
                { $sort: { createdAt: -1 } },
                {
                    $lookup: {
                        from: "appointments",
                        localField: "appointmentId",
                        foreignField: "_id",
                        as: "appointment",
                    },
                },
                {
                    $unwind: {
                        path: "$appointment",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $lookup: {
                        from: "services",
                        localField: "appointment.serviceId",
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
            count: transactions.length,
            transactions,
        });
    } catch (error) {
        next(error);
    }
}

// Admin: View all payment transactions (read-only)
export async function getAllTransactionsAdmin(req, res, next) {
    try {
        const transactions = await collections.transactions
            .aggregate([
                { $sort: { createdAt: -1 } },
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
                    $lookup: {
                        from: "appointments",
                        localField: "appointmentId",
                        foreignField: "_id",
                        as: "appointment",
                    },
                },
                {
                    $unwind: {
                        path: "$appointment",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $lookup: {
                        from: "services",
                        localField: "appointment.serviceId",
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
                    $project: {
                        "customer.password": 0,
                    },
                },
            ])
            .toArray();

        res.status(200).json({
            success: true,
            count: transactions.length,
            transactions,
        });
    } catch (error) {
        next(error);
    }
}
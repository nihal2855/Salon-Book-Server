import { ObjectId } from "mongodb";
import { collections } from "../config/db.js";

// Public: Get all active services (supports search, category filter, price sort, limit)
export async function getActiveServices(req, res, next) {
    try {
        const { search = "", category = "", sort = "", limit = "" } = req.query;

        const query = { status: "active" };

        if (search.trim()) {
            query.serviceName = { $regex: search.trim(), $options: "i" };
        }

        if (category.trim() && category.toLowerCase() !== "all") {
            query.category = category.trim();
        }

        let sortOption = { createdAt: -1 };
        if (sort === "price_asc") {
            sortOption = { price: 1 };
        } else if (sort === "price_desc") {
            sortOption = { price: -1 };
        }

        let cursor = collections.services.find(query).sort(sortOption);

        const parsedLimit = parseInt(limit, 10);
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
            cursor = cursor.limit(parsedLimit);
        }

        const services = await cursor.toArray();

        res.status(200).json({
            success: true,
            count: services.length,
            services,
        });
    } catch (error) {
        next(error);
    }
}

// Public: Get single service by ID
export async function getServiceById(req, res, next) {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid service ID format.",
            });
        }

        const service = await collections.services.findOne({ _id: new ObjectId(id) });

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Salon service not found.",
            });
        }

        res.status(200).json({
            success: true,
            service,
        });
    } catch (error) {
        next(error);
    }
}

// Admin: Get all services (active and inactive)
export async function getAllServicesAdmin(req, res, next) {
    try {
        const services = await collections.services
            .find({})
            .sort({ createdAt: -1 })
            .toArray();

        res.status(200).json({
            success: true,
            count: services.length,
            services,
        });
    } catch (error) {
        next(error);
    }
}

// Admin: Create a new service
export async function createService(req, res, next) {
    try {
        const { serviceName, category, description, price, duration, image, status } =
            req.body;

        if (!serviceName || !serviceName.trim()) {
            return res.status(400).json({
                success: false,
                message: "Service name is required.",
            });
        }

        if (!category || !category.trim()) {
            return res.status(400).json({
                success: false,
                message: "Service category is required.",
            });
        }

        if (!description || !description.trim()) {
            return res.status(400).json({
                success: false,
                message: "Service description is required.",
            });
        }

        const numericPrice = Number(price);
        if (isNaN(numericPrice) || numericPrice <= 0) {
            return res.status(400).json({
                success: false,
                message: "Price must be a positive number.",
            });
        }

        const numericDuration = Number(duration);
        if (isNaN(numericDuration) || numericDuration <= 0) {
            return res.status(400).json({
                success: false,
                message: "Estimated duration must be a positive number.",
            });
        }

        if (!image || !image.trim()) {
            return res.status(400).json({
                success: false,
                message: "Service image is required.",
            });
        }

        const validStatus = status === "inactive" ? "inactive" : "active";

        const newService = {
            serviceName: serviceName.trim(),
            category: category.trim(),
            description: description.trim(),
            price: numericPrice,
            duration: numericDuration,
            image: image.trim(),
            status: validStatus,
            createdAt: new Date(),
        };

        const result = await collections.services.insertOne(newService);

        res.status(201).json({
            success: true,
            message: "Service created successfully.",
            service: {
                _id: result.insertedId,
                ...newService,
            },
        });
    } catch (error) {
        next(error);
    }
}

// Admin: Update an existing service
export async function updateService(req, res, next) {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid service ID format.",
            });
        }

        const existing = await collections.services.findOne({ _id: new ObjectId(id) });
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Service not found.",
            });
        }

        const { serviceName, category, description, price, duration, image, status } =
            req.body;

        const updates = { updatedAt: new Date() };

        if (serviceName !== undefined) {
            if (!serviceName.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Service name cannot be empty.",
                });
            }
            updates.serviceName = serviceName.trim();
        }

        if (category !== undefined) {
            if (!category.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Service category cannot be empty.",
                });
            }
            updates.category = category.trim();
        }

        if (description !== undefined) {
            if (!description.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Service description cannot be empty.",
                });
            }
            updates.description = description.trim();
        }

        if (price !== undefined) {
            const numericPrice = Number(price);
            if (isNaN(numericPrice) || numericPrice <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Price must be a positive number.",
                });
            }
            updates.price = numericPrice;
        }

        if (duration !== undefined) {
            const numericDuration = Number(duration);
            if (isNaN(numericDuration) || numericDuration <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Duration must be a positive number.",
                });
            }
            updates.duration = numericDuration;
        }

        if (image !== undefined && image.trim()) {
            updates.image = image.trim();
        }

        if (status !== undefined) {
            if (status !== "active" && status !== "inactive") {
                return res.status(400).json({
                    success: false,
                    message: "Status must be either active or inactive.",
                });
            }
            updates.status = status;
        }

        await collections.services.updateOne(
            { _id: new ObjectId(id) },
            { $set: updates }
        );

        const updatedService = await collections.services.findOne({
            _id: new ObjectId(id),
        });

        res.status(200).json({
            success: true,
            message: "Service updated successfully.",
            service: updatedService,
        });
    } catch (error) {
        next(error);
    }
}

// Admin: Delete a service
export async function deleteService(req, res, next) {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid service ID format.",
            });
        }

        const result = await collections.services.deleteOne({
            _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Service not found.",
            });
        }

        res.status(200).json({
            success: true,
            message: "Service deleted successfully.",
        });
    } catch (error) {
        next(error);
    }
}
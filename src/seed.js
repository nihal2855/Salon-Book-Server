import dotenv from "dotenv";
import { connectDB, collections } from "./config/db.js";

dotenv.config();

const sampleServices = [
    {
        serviceName: "Precision Haircut & Blowout",
        category: "Haircut & Styling",
        description:
            "Tailored consultation, relaxing scalp wash, precision cut, and signature round-brush blowout finish.",
        price: 55,
        duration: 45,
        image:
            "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=900&q=80",
        status: "active",
        createdAt: new Date(),
    },
    {
        serviceName: "Dimensional Balayage & Gloss",
        category: "Hair Coloring",
        description:
            "Hand-painted highlights blended seamlessly for natural sun-kissed dimension, finished with a shine-enhancing toner gloss.",
        price: 165,
        duration: 150,
        image:
            "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=80",
        status: "active",
        createdAt: new Date(),
    },
    {
        serviceName: "Keratin Smoothing & Repair Therapy",
        category: "Hair Treatment",
        description:
            "Deep protein infusion treatment that eliminates frizz, restores elasticity, and leaves hair silky for up to 12 weeks.",
        price: 140,
        duration: 120,
        image:
            "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=900&q=80",
        status: "active",
        createdAt: new Date(),
    },
    {
        serviceName: "Hydra-Glow Botanical Facial",
        category: "Facial & Skincare",
        description:
            "Deep pore cleansing, gentle enzyme exfoliation, hydrating hyaluronic mask, and facial lymphatic massage.",
        price: 95,
        duration: 60,
        image:
            "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=80",
        status: "active",
        createdAt: new Date(),
    },
    {
        serviceName: "Deluxe Gel Manicure & Spa Pedicure",
        category: "Manicure & Pedicure",
        description:
            "Cuticle care, sugar scrub exfoliation, hydrating paraffin wrap, massage, and long-wear gel polish.",
        price: 75,
        duration: 75,
        image:
            "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80",
        status: "active",
        createdAt: new Date(),
    },
    {
        serviceName: "Aromatherapy Hot Stone Massage",
        category: "Spa & Massage",
        description:
            "Full-body Swedish and warm basalt stone massage with custom essential oils to melt away muscle tension.",
        price: 110,
        duration: 60,
        image:
            "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=80",
        status: "active",
        createdAt: new Date(),
    },
];

async function seedServices() {
    try {
        await connectDB();
        const existingCount = await collections.services.countDocuments();

        if (existingCount > 0) {
            console.log(`Database already has ${existingCount} services. Skipping seed.`);
            process.exit(0);
        }

        const result = await collections.services.insertMany(sampleServices);
        console.log(`Successfully inserted ${result.insertedCount} salon services.`);
        process.exit(0);
    } catch (error) {
        console.error("Failed to seed services:", error);
        process.exit(1);
    }
}

seedServices();
import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || "salonbook";

if (!uri) {
    throw new Error("MONGODB_URI is missing in environment variables.");
}

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

let db;
export let collections = {};

export async function connectDB() {
    if (db) return { db, collections };

    await client.connect();
    db = client.db(dbName);

    collections = {
        users: db.collection("users"),
        services: db.collection("services"),
        appointments: db.collection("appointments"),
        transactions: db.collection("transactions"),
    };

    // Create indexes for performance and data integrity
    await collections.users.createIndex({ email: 1 }, { unique: true });
    await collections.services.createIndex({ status: 1, category: 1 });
    await collections.appointments.createIndex({ customerId: 1, appointmentDate: 1 });
    await collections.transactions.createIndex({ stripeSessionId: 1 }, { unique: true });

    console.log(`Connected to MongoDB database: ${dbName}`);
    return { db, collections };
}
// This file is responsible for connecting to the MongoDB database.
// It exports a function to connect to the database and the client instance.
import dotenv from 'dotenv';
import { Db } from 'mongodb';
const { MongoClient, ServerApiVersion } = require('mongodb');
dotenv.config();
const uri = process.env.MONGODB_URI as string;
let db: Db;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

export async function connectDB() {
  try {
      // Connect the client to the server	(optional starting in v4.7)
    if (!db) {
      await client.connect();
      // Send a ping to confirm a successful connection
      client.db("admin").command({ ping: 1 });
      db = await client.db("weather_calendar_db");
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
  return db;
}

export {client};

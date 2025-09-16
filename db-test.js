// db-test.js
require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("openheart");
    const result = await db.collection("journal").insertOne({ 
      text: "Hello from Node test!", 
      createdAt: new Date() 
    });
    console.log("Inserted:", result.insertedId);

    const docs = await db.collection("journal").find().toArray();
    console.log("Docs:", docs);
  } catch (err) {
    console.error("❌ Connection failed:", err);
  } finally {
    await client.close();
  }
}

run();

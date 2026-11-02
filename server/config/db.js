import mongoose from "mongoose";

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("MONGODB_URI is not configured. Database-backed routes are unavailable.");
    return false;
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");
  return true;
}

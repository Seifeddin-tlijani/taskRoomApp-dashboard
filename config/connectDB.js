import mongoose from "mongoose";

// Specify the database name in the connection URI
const MONGODB_URI = "mongodb://127.0.0.1:27017/mydatabase";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });

// Export the mongoose object
export default mongoose;




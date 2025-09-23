import express from "express";
import path from "path";
import "dotenv/config";
import multer from 'multer';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { inMemoryStore } from './memory.js';
import { createLeadRoutes } from "./routes.js";

// Convert import.meta.url to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the Express application
const app = express();

app.get("/" , (req , res) =>{
  res.send("Server is Listening")

});

// Multer configuration for file uploads
const upload = multer({ dest: 'uploads/' });
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Use the routes from the dedicated router file, passing the data store
app.use('/', createLeadRoutes(inMemoryStore, upload));

// Start the server
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log("sever is listening on " + PORT);
  });
}
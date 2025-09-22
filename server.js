import express from "express";
import path from "path";
import cors from "cors";
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
const PORT = 3000;

// Multer configuration for file uploads
const upload = multer({ dest: 'uploads/' });
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Middleware
app.use(express.json());
app.use(cors());

// Use the routes from the dedicated router file, passing the data store
app.use('/', createLeadRoutes(inMemoryStore, upload));

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
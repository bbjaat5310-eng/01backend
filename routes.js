import express from "express";
import csv from "csv-parser";
import fs from "fs";
import { scoringService } from "./score.js";

// The router is now a function that accepts the data store and upload middleware
export const createLeadRoutes = (inMemoryStore, upload) => {
  const router = express.Router();

  // POST /offer: Accepts and stores product/offer details.
  router.post("/offer", (req, res) => {
    const { name, value_props, ideal_use_cases } = req.body;

    if (!name || !value_props || !ideal_use_cases) {
      return res
        .status(400)
        .send("Invalid offer data. All fields are required.");
    }

    inMemoryStore.currentOffer = { name, value_props, ideal_use_cases };
    console.log("Offer received:", inMemoryStore.currentOffer);
    res.status(201).json({
      message: "Offer details saved successfully.",
      offer: inMemoryStore.currentOffer,
    });
  });

  // POST /leads/upload: Accepts a CSV file and parses the leads.
  router.post("/leads/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).send("No CSV file uploaded.");
    }

    const uploadedFilePath = req.file.path;
    const leads = [];

    // Helper to sanitize keys (remove BOM, trim, etc.)
    function sanitizeRowKeys(row) {
      const cleanRow = {};
      for (const key in row) {
        // Remove BOM and invisible chars from key
        const cleanKey = key
          .replace(/^[^\w]*|[^\w]*$/g, "")
          .replace(/^\uFEFF/, "")
          .trim();
        cleanRow[cleanKey] = row[key];
      }
      return cleanRow;
    }

    fs.createReadStream(uploadedFilePath)
      .pipe(csv())
      .on("data", (row) => {
        leads.push(sanitizeRowKeys(row));
      })
      .on("end", () => {
        inMemoryStore.uploadedLeads = leads;
        console.log(
          `Successfully parsed ${inMemoryStore.uploadedLeads.length} leads.`
        );
        fs.unlinkSync(uploadedFilePath); // Clean up the temporary file
        res.status(200).json({
          message: "Leads uploaded successfully.",
          count: inMemoryStore.uploadedLeads.length,
          data: inMemoryStore.uploadedLeads,
        });
      })
      .on("error", (err) => {
        console.error("Error parsing CSV:", err);
        fs.unlinkSync(uploadedFilePath);
        res.status(500).send("Error processing the file.");
      });
  });

  // POST /score: Runs the scoring pipeline on the uploaded leads.
  router.post("/score", async (req, res) => {
    if (!inMemoryStore.currentOffer) {
      return res
        .status(400)
        .send("Please submit an offer first via POST /offer.");
    }
    if (inMemoryStore.uploadedLeads.length === 0) {
      return res
        .status(400)
        .send("Please upload a leads CSV first via POST /leads/upload.");
    }

    console.log("Starting scoring pipeline...");
    const newScoredLeads = await scoringService.runScore(
      inMemoryStore.uploadedLeads,
      inMemoryStore.currentOffer
    );
    inMemoryStore.scoredLeads = newScoredLeads;
    console.log("Scoring completed. Results are ready.");
    res.status(200).json({
      message: "Scoring complete.",
      count: inMemoryStore.scoredLeads.length,
    });
  });

  // GET /results: Returns the scored leads as a JSON array.
  router.get("/results", (req, res) => {
    if (inMemoryStore.scoredLeads.length === 0) {
      return res
        .status(404)
        .send("No scored leads found. Run the scoring pipeline first.");
    }
    res.status(200).json(inMemoryStore.scoredLeads);
    console.log(inMemoryStore);
  });

  // GET /results/export: Returns the scored leads as a CSV file.
  router.get("/results/export", (req, res) => {
    if (inMemoryStore.scoredLeads.length === 0) {
      return res.status(404).send("No scored leads to export.");
    }

    // Get all unique headers from all leads to ensure consistent columns
    const headerSet = new Set();
    inMemoryStore.scoredLeads.forEach((lead) => {
      Object.keys(lead).forEach((key) => headerSet.add(key));
    });
    const headers = Array.from(headerSet);

    const csvRows = [
      headers.join(","),
      ...inMemoryStore.scoredLeads.map((lead) =>
        headers
          .map((header) => {
            let value = lead[header];
            if (value === undefined || value === null) value = "";
            if (typeof value !== "string") value = JSON.stringify(value);
            // Escape quotes and wrap in quotes
            return `"${String(value).replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ];

    const csvContent = "\uFEFF" + csvRows.join("\n"); // Add BOM for Excel compatibility

    res.header("Content-Type", "text/csv; charset=utf-8");
    res.header(
      "Content-Disposition",
      'attachment; filename="scored_leads.csv"'
    );
    res.status(200).send(csvContent);
  });

  return router;
};

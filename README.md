Lead Scoring API
This project is a backend service for scoring leads based on a provided product offer and a list of leads in a CSV file. It uses a hybrid approach, combining a rule-based scoring system with a generative AI model for intent classification.

Features
Input APIs:

POST /offer: Accepts a JSON payload to define a product offer.

POST /leads/upload: Accepts a CSV file to upload a list of leads.

Scoring Pipeline:

Rule-based Scoring (max 50 points):

Role Relevance: Scores based on a lead's role (CEO, VP, Manager, etc.).

Industry Match: Scores based on an exact or adjacent match to ideal use cases.

Data Completeness: Scores for all required fields being present.

AI Layer (max 50 points):

Uses the Gemini 2.0 Flash model to classify a lead's buying intent as High, Medium, or Low.

Provides a one-sentence reasoning for the AI's classification.

Output APIs:

POST /score: Runs the scoring pipeline on the uploaded leads using the current offer.

GET /results: Returns the final scored leads as a JSON array.

GET /results/export: Exports the scored leads as a CSV file.

Setup
Clone the repository:

git clone <your-repo-url>
cd <your-project-folder>

Install dependencies:

npm install express multer csv-parser node-fetch @google/generative-ai csv-stringify

Configure API Key:
Add your Gemini API key to the score.js file.

const apiKey = "YOUR_API_KEY_HERE";

Note: For the purpose of this project, a placeholder key is used to allow the app to run without a valid key, reverting to a simulated response if none is found. For a real deployment, a valid key is required.

Start the server:

node server.js

The server will start on http://localhost:3000.

API Usage
Use a tool like cURL or Postman to interact with the API endpoints.

1. Set the Product Offer
This must be done before uploading leads.

curl -X POST http://localhost:3000/offer \
-H "Content-Type: application/json" \
-d '{
  "name": "AI Outreach Automation",
  "value_props": ["24/7 personalized outreach", "6x more meetings", "Automated lead qualification"],
  "ideal_use_cases": ["B2B SaaS mid-market", "Enterprise sales teams", "Agency partnerships"]
}'

2. Upload Leads CSV
curl -X POST http://localhost:3000/leads/upload \
-H "Content-Type: multipart/form-data" \
-F "file=@/path/to/your/leads.csv"

You can use the leads.csv file provided in this repository for testing.

3. Run the Scoring Pipeline
This endpoint triggers the lead scoring process.

curl -X POST http://localhost:3000/score

4. Get the Scored Results
This will return a JSON array of the leads with their assigned scores.

curl -X GET http://localhost:3000/results

5. Export Results as CSV
This will download a results.csv file with all the scored lead data.

curl -X GET http://localhost:3000/results/export -o results.csv

Explanation of Logic
Rule-Based Scoring
Role Relevance:

A lead with a role containing terms like "Head," "VP," "Chief," or "CEO" gets 20 points.

Roles with terms like "Manager" or "Analyst" get 10 points.

Industry Match:

An exact match between the lead's industry and an ideal_use_case gets 20 points.

A partial or "adjacent" match (e.g., "SaaS" in a "B2B SaaS" ideal use case) gets 10 points.

Data Completeness:

If all required fields (name, role, company, industry, location, linkedin_bio) are present, the lead gets 10 points.

AI-Based Scoring
The AI is given the full context of both the product offer and the lead's profile.

The prompt explicitly asks the Gemini model to classify the lead's intent as either High, Medium, or Low and provide a concise, one-sentence reason.

The AI's intent is then mapped to points: High = 50, Medium = 30, Low = 10.

The Final Score is the sum of the rule-based score and the AI-based points.

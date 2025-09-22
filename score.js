import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = "AIzaSyC9S8-6Fy0-ktclqxwycY9xNEPTcxd5A0Y";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
});

const scoringService = {
  runScore: async (leads, offer) => {
    const newScoredLeads = [];
    const generationConfig = {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          intent: { type: "STRING" },
          reasoning: { type: "STRING" },
        },
      },
    };

    for (const lead of leads) {
      let rule_score = 0;
      let reasoning = "";

      // --- Rule Layer (max 50 points) ---
      const role = lead.role ? lead.role.toLowerCase() : "";
      let rolePoints = 0;
      if (
        role.includes("ceo") ||
        role.includes("founder") ||
        role.includes("director") ||
        role.includes("head of")
      ) {
        rolePoints = 20;
        reasoning += "Role is a decision maker. ";
      } else if (
        role.includes("manager") ||
        role.includes("lead") ||
        role.includes("analyst")
      ) {
        rolePoints = 10;
        reasoning += "Role is an influencer. ";
      }
      rule_score += rolePoints;

      const industry = lead.industry ? lead.industry.toLowerCase() : "";
      let industryPoints = 0;
      const idealUseCases = offer.ideal_use_cases.map((uc) => uc.toLowerCase());
      const exactMatch = idealUseCases.some((uc) => industry.includes(uc));
      if (exactMatch) {
        industryPoints = 20;
        reasoning += "Industry matches an ideal customer profile. ";
      } else if (
        industry.includes("tech") ||
        industry.includes("software") ||
        (industry.includes("saas") &&
          idealUseCases.some((uc) => uc.includes("saas")))
      ) {
        industryPoints = 10;
        reasoning += "Industry is adjacent to an ideal customer profile. ";
      }
      rule_score += industryPoints;

      const requiredFields = [
        "name",
        "role",
        "company",
        "industry",
        "location",
        "linkedin_bio",
      ];
      const isComplete = requiredFields.every(
        (field) => lead[field] && lead[field].trim() !== ""
      );
      if (isComplete) {
        rule_score += 10;
        reasoning += "All data fields are present. ";
      }

      // --- AI Layer (max 50 points) ---
      let aiIntent = "Low";
      let aiReasoning = "No AI reasoning available.";

      const prompt = `
        You are an expert sales analyst. Your task is to analyze a lead's profile in the context of a product offer.
        Product Offer: ${JSON.stringify(offer)}
        Lead Profile: ${JSON.stringify(lead)}
        
        Based on the lead's profile, classify their buying intent for the product offer as 'High', 'Medium', or 'Low'.
        Explain your reasoning in 1-2 sentences.
      `;

      try {
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig,
        });
        // Log the raw API response for debugging
        console.log("Gemini API raw result:", result);
        const apiResponse = result.response.text();
        console.log("Gemini API response.text():", apiResponse);
        if (apiResponse) {
          try {
            const parsedContent = JSON.parse(apiResponse);
            console.log("Parsed Gemini API content:", parsedContent);
            aiIntent = parsedContent.intent || "Low";
            aiReasoning =
              parsedContent.reasoning || "No AI reasoning provided.";
          } catch (parseErr) {
            console.error(
              "Failed to parse Gemini API response as JSON:",
              apiResponse,
              parseErr
            );
            aiIntent = "Low";
            aiReasoning = `Failed to parse AI response: ${parseErr.message}`;
          }
        }
      } catch (error) {
        console.error("Gemini API call failed:", error);
        aiIntent = "Low";
        aiReasoning = `AI API call failed: ${error.message}`;
      }

      const aiPoints = {
        High: 50,
        Medium: 30,
        Low: 10,
      }[aiIntent];

      const final_score = rule_score + aiPoints;

      const scoredLead = {
        ...lead,
        intent: aiIntent,
        score: final_score,
        reasoning: reasoning.trim() + " " + aiReasoning,
      };
      newScoredLeads.push(scoredLead);
    }
    return newScoredLeads;
  },
};

export { scoringService };

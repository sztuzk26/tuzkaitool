import OpenAI from "openai";

// Works on Replit (AI_INTEGRATIONS_*) and on any other host (OPENAI_API_KEY).
// If no key is set the server still starts; the AI assistant simply reports
// "unavailable" when someone asks a question (the rest of the site keeps working).
const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || undefined;

export const openai = new OpenAI({
  apiKey: apiKey || "not-configured",
  baseURL,
});

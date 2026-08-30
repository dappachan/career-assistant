import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";
import db from "./db";

console.log("key loaded:" , process.env.GEMINI_API_KEY ? "yes": "MISSING");
const app = express();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL?? "gemini-3.6-flash" });

app.use(cors());
app.use(express.json());


app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "career-assistant"});
});

app.get("/api/reviews", (req, res) => {
    const rows = db.prepare(
        "SELECT id, created_at, resume_text, feedback FROM reviews ORDER BY ID DESC LIMIT 5"
    ).all()
    res.json({ reviews: rows });
})

app.post("/api/review", async (req, res) => {
  const { resumeText } = req.body;
  if (!resumeText || typeof resumeText !== "string" || resumeText.trim().length < 50) {
    return res.status(400).json({ error: "resumeText of at least 50 characters is required." });
  }

  try {
    const prompt = `You are an experienced technical recruiter. Review the following resume text and give specific, actionable feedback: 3 strengths, 3 improvements, and a rewritten version of the weakest bullet point.

Resume:
"""
${resumeText}
"""`;

    const result = await model.generateContent(prompt);
    const feedback = result.response.text();
    db.prepare(
        "INSERT INTO reviews (resume_text, feedback) VALUES (?, ?)"
    ).run(resumeText, feedback);
    res.json({ feedback });
  } catch (err) {
    console.error("Gemini call failed:", err);
    res.status(500).json({ error: "AI service is unavailable. Try again shortly." });
  }
});

app.post("/api/echo", (req, res) => {
    const { message } = req.body;
    if ( !message || typeof message !== "string") {
        return res.status(400).json({ error: "message is required."})
    }
    res.json({ echoed: message.toUpperCase(), length: message.length })
});

export default app;
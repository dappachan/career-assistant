import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";
import db from "./db";
import jwt from "jsonwebtoken"

console.log("key loaded:" , process.env.GEMINI_API_KEY ? "yes": "MISSING");
const app = express();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL?? "gemini-3.6-flash" });

app.use(cors());
app.use(express.json());

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Must provide a Bearer token in header."});
  }

  const token = header.split(" ")[1];

  try {
    jwt.verify(token, process.env.JWT_SECRET!);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

}

app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "career-assistant"});
});

app.get("/api/reviews", authMiddleware, (req, res) => {
    const rows = db.prepare(
        "SELECT id, created_at, resume_text, feedback FROM reviews ORDER BY ID DESC LIMIT 5"
    ).all()
    res.json({ reviews: rows });
})

app.post("/api/review", authMiddleware, async (req, res) => {
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

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if(username === "david" && password === "demo123"){
    const token = jwt.sign({ username }, process.env.JWT_SECRET!, { expiresIn: "1h"});
    return res.json({ token });
  }
  res.status(401).json({ error: "Invalid credentials" });
});


app.post("/api/echo", (req, res) => {
    const { message } = req.body;
    if ( !message || typeof message !== "string") {
        return res.status(400).json({ error: "message is required."})
    }
    res.json({ echoed: message.toUpperCase(), length: message.length })
});

app.delete("/api/reviews/:id",authMiddleware, async (req, res) => {
    const itemId = req.params.id; 
    if ( !itemId || typeof itemId !== "string") {
      return res.status(400).json({ error: "ID is required."})
    }
      const info = db.prepare(
        "DELETE FROM reviews WHERE id = ?"
      ).run(itemId);

      res.json({deleted: info.changes > 0});
});

export default app;
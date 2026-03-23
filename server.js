const express = require("express");
const cors    = require("cors");
const fetch   = require("node-fetch");
require("dotenv").config();

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public")); // מגיש את ה-HTML מתיקיית public

// ── בדיקה שהשרת עובד ──────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    apiKey: process.env.ANTHROPIC_API_KEY ? "✅ מוגדר" : "❌ חסר",
  });
});

// ── CHAT – מאמן קריירה AI ─────────────────────
app.post("/api/chat", async (req, res) => {
  const { messages, system } = req.body;
  if (!messages) return res.status(400).json({ error: "messages is required" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":    "application/json",
        "x-api-key":       process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system:     system || "You are a helpful career coach. Answer in Hebrew.",
        messages,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "API error");
    res.json({ reply: data.content?.[0]?.text || "" });

  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: "שגיאת שרת – נסה שוב" });
  }
});

// ── JOB MATCH – התאמה למשרה ───────────────────
app.post("/api/job-match", async (req, res) => {
  const { cvText, jobDescription } = req.body;
  if (!cvText || !jobDescription)
    return res.status(400).json({ error: "cvText and jobDescription are required" });

  const prompt = `השווה קו"ח לדרישות משרה. ענה JSON בלבד, ללא markdown.
קו"ח: ${cvText}
משרה: ${jobDescription}
{
  "matchScore": <0-100>,
  "matchTitle": "<משפט קצר>",
  "matchSub": "<עידוד קצר>",
  "skills": [{"name":"<מיומנות>","myLevel":<0-100>,"required":<0-100>}],
  "gaps": [{"skill":"<פער>","currentChance":<0-100>,"afterCourse":<0-100>,"courseName":"<שם קורס>","platform":"<פלטפורמה>","duration":"<משך>","reason":"<למה>"}]
}
מקסימום 3 מיומנויות ו-3 פערים.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":    "application/json",
        "x-api-key":       process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 1200,
        messages:   [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "API error");

    let raw = data.content?.[0]?.text || "{}";
    raw = raw.replace(/```json|```/g, "").trim();
    res.json(JSON.parse(raw));

  } catch (err) {
    console.error("Job match error:", err.message);
    res.status(500).json({ error: "שגיאת שרת – נסה שוב" });
  }
});

// ── INTERVIEW FEEDBACK – מאמן ראיונות ────────
app.post("/api/interview-feedback", async (req, res) => {
  const { question, answer, role, lang } = req.body;
  if (!question || !answer)
    return res.status(400).json({ error: "question and answer are required" });

  const isHe = lang !== "en";
  const prompt = isHe
    ? `שאלת ראיון: "${question}"\nתפקיד: ${role || "לא צוין"}\nתשובה: "${answer}"\n\nתן משוב בעברית: ציון מ-100 (ציין "ציון: XX"), מה טוב, מה לשפר. 4 משפטים.`
    : `Interview question: "${question}"\nRole: ${role || "not specified"}\nAnswer: "${answer}"\n\nProvide feedback in English: score out of 100 (write "score: XX"), what's good, what to improve. 4 sentences.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":    "application/json",
        "x-api-key":       process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 600,
        messages:   [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "API error");
    res.json({ reply: data.content?.[0]?.text || "" });

  } catch (err) {
    console.error("Interview error:", err.message);
    res.status(500).json({ error: "שגיאת שרת – נסה שוב" });
  }
});

// ── הפעלת השרת ────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ CareerUp רץ על http://localhost:${PORT}`);
  console.log(`🔑 API Key: ${process.env.ANTHROPIC_API_KEY ? "✅ מוגדר" : "❌ חסר ב-.env"}\n`);
});

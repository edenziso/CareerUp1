// ═══════════════════════════════════════════════════
// api/ai.js  –  Gemini ראשי · Claude גיבוי אוטומטי
// ═══════════════════════════════════════════════════
// Vercel Serverless Function
// משתני סביבה נדרשים (הגדר ב-Vercel Dashboard → Settings → Environment Variables):
//   GEMINI_API_KEY   ← Google AI Studio → https://aistudio.google.com/apikey
//   ANTHROPIC_API_KEY ← console.anthropic.com
// ═══════════════════════════════════════════════════
 
export default async function handler(req, res) {
  // CORS – מאפשר קריאה מכל דומיין (לייצור תגביל ל-domain שלך)
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });
 
  const { message, mode = "chat" } = req.body;
  if (!message) return res.status(400).json({ error: "message is required" });
 
  // ── בחר System Prompt לפי מצב ─────────────────
  const SYSTEM_PROMPTS = {
    chat: `אתה CareerUp Agent – מאמן קריירה מומחה לשוק ההייטק הישראלי.
ענה תמיד בעברית, בצורה ממוקדת ופרקטית.
השתמש ב-Markdown: **הדגשות**, רשימות עם -, כותרות עם ###.
אל תכתוב יותר מ-3 פסקאות אלא אם נשאלת שאלה מורכבת.`,
    improve: `אתה עוזר כתיבה לקו"ח בהייטק.
פעל כ-API – החזר *אך ורק* את הטקסט הסופי המשופר, ללא הסברים, ללא Markdown, ללא אפשרויות.
מחרוזת אחת נקייה בלבד.`,
    jobmatch: `אתה מנתח HR מומחה. החזר *אך ורק* JSON תקין לפי הסכמה המבוקשת, ללא markdown, ללא טקסט לפני/אחרי.`
  };
 
  const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;
 
  // ── 1. נסה Gemini ──────────────────────────────
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const reply = await callGemini(message, systemPrompt, geminiKey);
      return res.json({ reply, provider: "gemini" });
    } catch (err) {
      console.warn("Gemini failed, trying Claude:", err.message);
    }
  }
 
  // ── 2. גיבוי: Claude ───────────────────────────
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (claudeKey) {
    try {
      const reply = await callClaude(message, systemPrompt, claudeKey);
      return res.json({ reply, provider: "claude" });
    } catch (err) {
      console.error("Claude also failed:", err.message);
    }
  }
 
  return res.status(500).json({ error: "כל מפתחות ה-AI חסרים או לא עובדים. בדוק את ה-Environment Variables ב-Vercel." });
}
 
// ═══════════════════════════════════════════════════
// GEMINI  (gemini-2.0-flash  –  חינמי ומהיר)
// ═══════════════════════════════════════════════════
async function callGemini(userMessage, systemPrompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
 
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    generationConfig: { maxOutputTokens: 1500, temperature: 0.7 }
  };
 
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
 
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `Gemini HTTP ${res.status}`);
  }
 
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}
 
// ═══════════════════════════════════════════════════
// CLAUDE  (claude-sonnet-4-6  –  גיבוי)
// ═══════════════════════════════════════════════════
async function callClaude(userMessage, systemPrompt, apiKey) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-6",
      max_tokens: 1500,
      system:     systemPrompt,
      messages:   [{ role: "user", content: userMessage }]
    })
  });
 
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `Claude HTTP ${res.status}`);
  }
 
  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("Claude returned empty response");
  return text;
}
 

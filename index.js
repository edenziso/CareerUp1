const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const GEMINI_KEY = defineSecret("GEMINI_API_KEY");

exports.api = onRequest(
  { secrets: [GEMINI_KEY], timeoutSeconds: 60, cors: true },
  async (req, res) => {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { message, mode = "chat" } = req.body;
    if (!message) return res.status(400).json({ error: "message is required" });

    const PROMPTS = {
      chat:     "אתה CareerUp Agent – מאמן קריירה מומחה לשוק ההייטק הישראלי. ענה בעברית, ממוקד ופרקטי.",
      improve:  "אתה עוזר כתיבה לקו\"ח. החזר אך ורק את הטקסט המשופר, ללא הסברים וללא markdown.",
      jobmatch: "אתה מנתח HR. החזר אך ורק JSON תקין לפי הסכמה. ללא markdown, ללא טקסט לפני או אחרי."
    };

    try {
      const fetch = (...a) => import("node-fetch").then(({ default: f }) => f(...a));
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY.value()}`;

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: PROMPTS[mode] || PROMPTS.chat }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 1500, temperature: 0.7 }
        })
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error?.message || `Gemini error ${resp.status}`);

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("תשובה ריקה מ-Gemini");

      return res.json({ reply: text });
    } catch (err) {
      console.error("AI Error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }
);

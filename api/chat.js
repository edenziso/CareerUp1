export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ reply: 'שגיאה: שיטה לא מורשית' });
  }

  try {
    const { message } = req.body;
    
    // שולף את המפתח החוקי שלך מ-Vercel
    const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return res.status(200).json({ reply: '🚨 השרת לא מוצא את מפתח ה-API.' });
    }

    const systemPrompt = `אתה CareerUp Agent, מומחה קריירה. תענה בעברית, בצורה מקצועית ותשתמש ב-Markdown לעיצוב.`;

    // הפנייה הישירה לקלוד
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6", // 🚀 הנה הקסם! המודל הכי עדכני וחזק של 2026
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: message }]
      })
    });

    const data = await response.json();

    // הדפסת שגיאות של קלוד (כדי שנהיה בטוחות שהחלפנו)
    if (data.error) {
       return res.status(200).json({ reply: `🚨 שגיאה מאנתרופיק: ${data.error.message}` });
    }

    // הכל עבד פיקס!
    res.status(200).json({ reply: data.content[0].text });

  } catch (error) {
    res.status(200).json({ reply: `🚨 שגיאת רשת בשרת: ${error.message}` });
  }
}

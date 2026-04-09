export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ reply: 'שגיאה: שיטה לא מורשית' });
  }

  try {
    const { message } = req.body;
    
    // קורא רק את המפתח החדש
    const apiKey = process.env.CLAUDE_API_KEY;
    
    if (!apiKey) {
      return res.status(200).json({ reply: '🚨 השרת לא מצא את המפתח. ודאי שקוראים לו CLAUDE_API_KEY ב-Vercel.' });
    }

    const systemPrompt = `אתה CareerUp Agent, מומחה קריירה. ענה בעברית מקצועית ועם Markdown.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-latest", // המודל הכי חזק ששילמת עליו!
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: message }]
      })
    });

    const data = await response.json();

    // הוספנו את המילה "מעודכנת" כדי שנדע שהקוד התחלף!
    if (data.error) {
       return res.status(200).json({ reply: `🚨 שגיאה מעודכנת מאנתרופיק: ${data.error.message}` });
    }

    res.status(200).json({ reply: data.content[0].text });

  } catch (error) {
    res.status(200).json({ reply: `🚨 שגיאת שרת מעודכנת: ${error.message}` });
  }
}

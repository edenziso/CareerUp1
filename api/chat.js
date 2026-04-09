export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ reply: 'שגיאה: שיטה לא מורשית' });
  }

  try {
    const { message } = req.body;
    const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.status(200).json({ reply: '🚨 השרת לא מוצא את מפתח ה-API.' });
    }

    const systemPrompt = `אתה CareerUp Agent, מומחה קריירה. תענה בעברית, מקצועי ועם Markdown.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307", // מודל חלופי סופר מהיר וחינמי!
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: message }]
      })
    });

    const data = await response.json();

    if (data.error) {
       return res.status(200).json({ reply: `🚨 שגיאה משרתי Anthropic: ${data.error.message}` });
    }

    res.status(200).json({ reply: data.content[0].text });

  } catch (error) {
    res.status(200).json({ reply: `🚨 שגיאת רשת בשרת: ${error.message}` });
  }
}

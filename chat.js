import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  const { message, history } = req.body;
  const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1000,
      system: "אתה CareerUp Agent, מומחה קריירה מנוסה. עזור למשתמש בבניית קו\"ח, הכנה לראיונות וייעוץ מקצועי. ענה בעברית מקצועית וקצרה.",
      messages: [{ role: "user", content: message }]
    });

    res.status(200).json({ reply: msg.content[0].text });
  } catch (error) {
    res.status(500).json({ error: 'AI Error' });
  }
}

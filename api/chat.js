import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message } = req.body;
  const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
  });

  const systemPrompt = `אתה CareerUp Agent, המומחה המוביל בישראל לייעוץ קריירה בהייטק. 
  התפקיד שלך הוא לספק תשובות ברמה הגבוהה ביותר בשוק בנושאים:
  1. כתיבת קו"ח (ATS): שימוש במילות מפתח, הדגשת הישגים כמותיים, ומבנה מקצועי.
  2. בניית מותג אישי: אופטימיזציה של LinkedIn ונטוורקינג.
  3. סימולציות ראיון: שימוש בשיטת STAR (Situation, Task, Action, Result).
  4. צמיחה מקצועית: מעבר בין תפקידים (למשל מ-CSM ל-Product) ולימוד כישורים חדשים.

  הנחיות לתשובות:
  - ענה בעברית רהוטה, מקצועית ואנרגטית.
  - השתמש ב-Markdown: בולטים, כותרות והדגשות כדי שהתשובה תהיה קריאה ומרשימה.
  - תמיד תן ערך מוסף: אל תענה רק על מה שנשאל, תן טיפ אסטרטגי קדימה.`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    });

    res.status(200).json({ reply: msg.content[0].text });
  } catch (error) {
    console.error("Claude API Error:", error);
    res.status(500).json({ error: 'ה-AI נרדם לרגע.' });
  }
}

import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  const { message } = req.body;
  const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

  // ה-MEGA PROMPT שמגדיר את המומחיות
  const systemPrompt = `אתה CareerUp Agent, סוכן ה-AI המוביל בעולם לייעוץ קריירה, כתיבת קורות חיים והכנה לראיונות, עם התמחות ספציפית בשוק ההייטק הישראלי.
  
  היכולות שלך כוללות:
  1. כתיבת קו"ח ברמה של 1% העליונים: שימוש במילות מפתח (ATS), כימות הישגים (מספרים וביצועים), ומבנה מקצועי.
  2. אסטרטגיית צמיחה: בניית מסלולי למידה ממוקדים לסגירת פערים טכנולוגיים (למשל מ-CSM ל-Product).
  3. סימולציות ראיון: אתה יודע לאתגר את המשתמש בשאלות קשות ולתת משוב לפי שיטת STAR.
  
  הנחיות לתשובות:
  - ענה תמיד בעברית מקצועית, רהוטה ומעוררת השראה (Supportive yet direct).
  - השתמש בפורמט Markdown (בולטים, הדגשות) כדי שהתשובה תהיה קריאה.
  - אם המשתמש שואל שאלה כללית, תן לו ערך מוסף מעבר למה שביקש.
  - אם מדובר בסימולציית ראיון, היכנס לדמות של מראיין בכיר בגוגל/מטא.`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: "user", content: message }]
    });

    res.status(200).json({ reply: msg.content[0].text });
  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({ error: 'AI Error' });
  }
}

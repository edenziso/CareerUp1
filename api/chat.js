import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  // 1. בדיקה שהבקשה מגיעה בפורמט הנכון
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { message } = req.body;
    
    // 2. חיפוש המפתח - מושך גם את השם החדש וגם את הישן ליתר ביטחון
    const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      // אם אין מפתח, נחזיר את זה כתשובה בתוך הצ'אט!
      return res.status(200).json({ reply: '🚨 שגיאת שרת: חסר מפתח API ב-Vercel (CLAUDE_API_KEY).' });
    }

    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    // 3. ה-Mega-Prompt (הוראות הסוכן)
    const systemPrompt = `אתה CareerUp Agent, המומחה המוביל בישראל לייעוץ קריירה בהייטק. 
    התפקיד שלך הוא לספק תשובות ברמה הגבוהה ביותר בשוק בנושאים:
    1. כתיבת קו"ח (ATS): שימוש במילות מפתח, הדגשת הישגים כמותיים, ומבנה מקצועי.
    2. בניית מותג אישי: אופטימיזציה של LinkedIn ונטוורקינג.
    3. סימולציות ראיון: שימוש בשיטת STAR (Situation, Task, Action, Result).
    4. צמיחה מקצועית: מעבר בין תפקידים (למשל מ-CSM לניהול מוצר) ולימוד כישורים חדשים.

    הנחיות לתשובות:
    - ענה בעברית רהוטה, מקצועית ואנרגטית.
    - השתמש ב-Markdown: בולטים, כותרות והדגשות כדי שהתשובה תהיה קריאה ומרשימה.
    - תמיד תן ערך מוסף: אל תענה רק על מה שנשאל, תן טיפ אסטרטגי קדימה.`;

    // 4. קריאה למודל הכי חזק של קלוד (Sonnet 3.5)
    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    });

    // 5. הכל עבד! מחזירים את התשובה
    res.status(200).json({ reply: msg.content[0].text });

  } catch (error) {
    // 6. תפיסת שגיאות - אם קלוד דוחה את הבקשה, הטקסט יודפס באתר שלך!
    console.error("Claude API Error:", error);
    res.status(200).json({ reply: `🚨 שגיאה מהשרת של קלוד: ${error.message}` });
  }
}

export default async function handler(req, res) {
  // מוודא שהבקשה הגיעה מהצ'אט
  if (req.method !== 'POST') {
    return res.status(200).json({ reply: 'שגיאה: שיטה לא מורשית' });
  }

  try {
    const { message } = req.body;
    
    // שולף את המפתח (תומך בשני השמות)
    const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return res.status(200).json({ reply: '🚨 השרת לא מוצא את מפתח ה-API. ודאי שהוא מוגדר ב-Vercel.' });
    }

    // המוח המטורף של הסוכן
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

    // הפנייה הישירה לקלוד (בלי שום ספריות בעייתיות!)
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: message }]
      })
    });

    const data = await response.json();

    // אם קלוד חוסם את הבקשה (למשל בעיית אשראי בחשבון) נראה את זה ישירות בצ'אט!
    if (data.error) {
       return res.status(200).json({ reply: `🚨 קלוד החזיר שגיאה: ${data.error.message}` });
    }

    // הכל עבד פיקס!
    res.status(200).json({ reply: data.content[0].text });

  } catch (error) {
    // תופס שגיאות רשת אחרות
    res.status(200).json({ reply: `🚨 שגיאת רשת בשרת: ${error.message}` });
  }
}

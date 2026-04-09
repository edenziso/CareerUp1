module.exports = async function handler(req, res) {
  // מוודא שהבקשה הגיעה מהצ'אט
  if (req.method !== 'POST') {
    return res.status(200).json({ reply: 'שגיאה: שיטה לא מורשית' });
  }

  try {
    const { message } = req.body;
    
    // שולף את המפתח (תומך בשני השמות שהגדרנו)
    const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return res.status(200).json({ reply: '🚨 גרסה חדשה! השרת לא מוצא את מפתח ה-API. ודאי שהוא מוגדר ב-Vercel.' });
    }

    const systemPrompt = `אתה CareerUp Agent, המומחה המוביל בישראל לייעוץ קריירה בהייטק. 
    התפקיד שלך הוא לספק תשובות ברמה הגבוהה ביותר בנושאים: כתיבת קו"ח, נטוורקינג, סימולציות ראיון וצמיחה מקצועית.
    הנחיות לתשובות:
    - ענה בעברית רהוטה, מקצועית ואנרגטית.
    - השתמש ב-Markdown: בולטים והדגשות.
    - תמיד תן ערך מוסף: אל תענה רק על מה שנשאל, תן טיפ אסטרטגי קדימה.`;

    // פנייה ישירה לקלוד - בלי ספריות שגורמות לקריסות
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307", // מודל Haiku שעובד תמיד
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: message }]
      })
    });

    const data = await response.json();

    // הדפסת שגיאות של קלוד עם טביעת האצבע שלנו!
    if (data.error) {
       return res.status(200).json({ reply: `🚨 גרסה חדשה! קלוד החזיר שגיאה: ${data.error.message}` });
    }

    // הכל עבד מעולה
    res.status(200).json({ reply: data.content[0].text });

  } catch (error) {
    // תופס שגיאות רשת פנימיות
    res.status(200).json({ reply: `🚨 גרסה חדשה! שגיאת רשת בשרת: ${error.message}` });
  }
};

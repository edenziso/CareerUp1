import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { cvText, jobDescription } = req.body;

  if (!cvText || !jobDescription) {
    return res.status(400).json({ error: 'Missing data' });
  }

  const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
  });

  const systemPrompt = `אתה יועץ קריירה מומחה. תפקידך להשוות בין קורות החיים לדרישות המשרה ולייצר מסלול למידה וצמיחה.
  חובה עליך להחזיר *אך ורק* אובייקט JSON תקין. אסור לכתוב מילה לפני או אחרי. המבנה חייב להיות:
  {
    "matchScore": מספר שלם מ-0 עד 100,
    "matchTitle": "כותרת קצרה להתאמה",
    "matchSub": "משפט סיכום קצר",
    "skills": [
      {"name": "שם כישור מהותי", "myLevel": ציון מהקו"ח, "required": חשיבות למשרה}
    ],
    "gaps": [
      {
        "skill": "הכישור שחסר",
        "reason": "למה זה קריטי",
        "currentChance": ציון נוכחי (זהה ל-matchScore),
        "afterCourse": ציון לאחר סיום הקורס,
        "courseName": "שם מדויק של קורס מקוון בנושא",
        "platform": "Udemy / Coursera / YouTube",
        "duration": "זמן משוער"
      }
    ]
  }
  צור לפחות 3 skills ו-1-2 gaps. ענה בעברית.`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1500,
      temperature: 0.1,
      system: systemPrompt,
      messages: [
        { role: "user", content: `קורות חיים:\n${cvText}\n\nתיאור משרה:\n${jobDescription}` }
      ],
    });

    let responseText = msg.content[0].text.trim();
    if (responseText.startsWith("```json")) {
        responseText = responseText.replace(/^```json\n/, "").replace(/\n```$/, "");
    }

    const jsonResponse = JSON.parse(responseText);
    res.status(200).json(jsonResponse);

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: 'Failed analysis' });
  }
}

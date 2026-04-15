const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('../middleware/auth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const router = express.Router();
router.use(authenticateToken);

// GET /api/career/chat/history - שליפת היסטוריית צ'אט
router.get('/chat/history', async (req, res) => {
  try {
    const { data: messages, error } = await supabase
      .from('chat_history')
      .select('id, role, content, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) throw error;
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// POST /api/career/chat/save - שמירת הודעות צ'אט
router.post('/chat/save', async (req, res) => {
  try {
    const { messages } = req.body;
    const formattedMessages = messages.map(msg => ({
      user_id: req.user.id,
      role: msg.role,
      content: msg.content
    }));

    const { error } = await supabase.from('chat_history').insert(formattedMessages);
    if (error) throw error;

    res.json({ message: 'Chat history saved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save chat history' });
  }
});

// GET /api/career/interviews - שליפת ראיונות עבר
router.get('/interviews', async (req, res) => {
  try {
    const { data: sessions, error } = await supabase
      .from('interview_sessions')
      .select('id, interview_type, target_role, overall_score, completed, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch interview sessions' });
  }
});

// GET /api/career/dashboard - נתוני דשבורד משולבים
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;

    // שליפה מקבילית של כל נתוני הדשבורד
    const [userRes, resumeCountRes, matchRes, interviewRes] = await Promise.all([
      supabase.from('users').select('full_name, field, experience_level, streak, xp, avatar_url').eq('id', userId).single(),
      supabase.from('resumes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('job_analyses').select('match_percentage').eq('user_id', userId),
      supabase.from('interview_sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('completed', true)
    ]);

    const user = userRes.data;
    const matches = matchRes.data || [];
    const avgMatch = matches.length ? Math.round(matches.reduce((a, b) => a + b.match_percentage, 0) / matches.length) : 0;

    res.json({
      user,
      stats: {
        resumeCount: resumeCountRes.count || 0,
        averageJobMatch: avgMatch,
        completedInterviews: interviewRes.count || 0,
        totalXP: user.xp,
        streak: user.streak
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;ה

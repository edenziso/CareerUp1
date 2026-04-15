const express = require('express');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('../middleware/auth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const router = express.Router();
router.use(authenticateToken);

// GET /api/users/profile - שליפת פרטי פרופיל
router.get('/profile', async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, field, experience_level, linkedin_url, github_url, avatar_url, streak, xp, created_at')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/users/profile - עדכון פרטי פרופיל
router.put('/profile', async (req, res) => {
  try {
    const { fullName, field, experienceLevel, linkedinUrl, githubUrl, avatarUrl } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .update({
        full_name: fullName,
        field: field,
        experience_level: experienceLevel,
        linkedin_url: linkedinUrl,
        github_url: githubUrl,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ user, message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/users/change-password - שינוי סיסמה
router.put('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Invalid password data' });
    }

    const { data: user } = await supabase.from('users').select('password_hash').eq('id', req.user.id).single();

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await supabase.from('users').update({ password_hash: newHash }).eq('id', req.user.id);
    await supabase.from('refresh_tokens').delete().eq('user_id', req.user.id);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// GET /api/users/xp-history - שליפת היסטוריית XP
router.get('/xp-history', async (req, res) => {
  try {
    const { data: events, error } = await supabase
      .from('xp_events')
      .select('event_type, xp_gained, description, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch XP history' });
  }
});

module.exports = router;

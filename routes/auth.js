const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// יצירת חיבור ל-Supabase בעזרת המפתחות שהגדרת ב-Vercel
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const { generateTokens, JWT_SECRET, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    // ולידציה בסיסית
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // בדיקה אם המשתמש כבר קיים ב-DB
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // הצפנת סיסמה
    const passwordHash = await bcrypt.hash(password, 12);

    // יצירת המשתמש החדש
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        email: email.toLowerCase(),
        password_hash: passwordHash,
        full_name: fullName || null,
        xp: 20 // בונוס הרשמה
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    // רישום אירוע XP
    await supabase.from('xp_events').insert([{
      user_id: newUser.id,
      event_type: 'registration',
      xp_gained: 20,
      description: 'Welcome to CareerUp!'
    }]);

    // יצירת טוקנים
    const { accessToken, refreshToken } = generateTokens(newUser.id);

    // שמירת refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('refresh_tokens').insert([{
      user_id: newUser.id,
      token: refreshToken,
      expires_at: expiresAt
    }]);

    res.status(201).json({
      message: 'Registration successful',
      user: { id: newUser.id, email: newUser.email, full_name: newUser.full_name, xp: newUser.xp, streak: newUser.streak },
      accessToken,
      refreshToken
    });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (!user || fetchError) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // חישוב Streak
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let newStreak = user.streak;

    if (user.last_active === yesterday) {
      newStreak += 1;
    } else if (user.last_active !== today) {
      newStreak = 1;
    }

    // עדכון פעילות אחרונה
    await supabase
      .from('users')
      .update({ last_active: today, streak: newStreak })
      .eq('id', user.id);

    const { accessToken, refreshToken } = generateTokens(user.id);

    // ניקוי טוקנים ישנים ושמירת חדש
    await supabase.from('refresh_tokens').delete().eq('user_id', user.id).lt('expires_at', new Date().toISOString());
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('refresh_tokens').insert([{ user_id: user.id, token: refreshToken, expires_at: expiresAt }]);

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, full_name: user.full_name, xp: user.xp, streak: newStreak },
      accessToken,
      refreshToken
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;

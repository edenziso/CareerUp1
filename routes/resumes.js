const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('../middleware/auth');

// יצירת חיבור ל-Supabase בעזרת המפתחות מ-Vercel
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const router = express.Router();

// כל הנתיבים כאן דורשים שהמשתמש יהיה מחובר
router.use(authenticateToken);

// GET /api/resumes - קבלת כל קורות החיים של המשתמש
router.get('/', async (req, res) => {
  try {
    const { data: resumes, error } = await supabase
      .from('resumes')
      .select('id, title, template, language, ai_score, is_default, created_at, updated_at')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    res.json({ resumes: resumes || [] });
  } catch (err) {
    console.error('Get resumes error:', err);
    res.status(500).json({ error: 'Failed to fetch resumes' });
  }
});

// GET /api/resumes/:id - קבלת קורות חיים ספציפיים
router.get('/:id', async (req, res) => {
  try {
    const { data: resume, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    resume.content = JSON.parse(resume.content || '{}');
    res.json({ resume });
  } catch (err) {
    console.error('Get resume error:', err);
    res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

// POST /api/resumes - יצירת קורות חיים חדשים
router.post('/', async (req, res) => {
  try {
    const { title, template, language, content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Resume content is required' });
    }

    const { data: resume, error: insertError } = await supabase
      .from('resumes')
      .insert([{
        user_id: req.user.id,
        title: title || 'My Resume',
        template: template || 'classic',
        language: language || 'en',
        content: JSON.stringify(content)
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    // הענקת XP על יצירת קורות חיים ראשונים
    const { count } = await supabase
      .from('resumes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    if (count === 1) {
      await supabase.from('xp_events').insert([{
        user_id: req.user.id,
        event_type: 'first_resume',
        xp_gained: 30,
        description: 'Created your first resume!'
      }]);

      // עדכון ה-XP של המשתמש
      const { data: user } = await supabase.from('users').select('xp').eq('id', req.user.id).single();
      if (user) {
        await supabase.from('users').update({ xp: (user.xp || 0) + 30 }).eq('id', req.user.id);
      }
    }

    resume.content = JSON.parse(resume.content);
    res.status(201).json({ resume, message: 'Resume created successfully' });
  } catch (err) {
    console.error('Create resume error:', err);
    res.status(500).json({ error: 'Failed to create resume' });
  }
});

// PUT /api/resumes/:id - עדכון קורות חיים
router.put('/:id', async (req, res) => {
  try {
    const { title, template, language, content, ai_score } = req.body;
    
    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (template !== undefined) updates.template = template;
    if (language !== undefined) updates.language = language;
    if (content !== undefined) updates.content = JSON.stringify(content);
    if (ai_score !== undefined) updates.ai_score = ai_score;

    const { data: resume, error } = await supabase
      .from('resumes')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error || !resume) {
      return res.status(404).json({ error: 'Resume not found or update failed' });
    }

    resume.content = JSON.parse(resume.content);
    res.json({ resume, message: 'Resume updated successfully' });
  } catch (err) {
    console.error('Update resume error:', err);
    res.status(500).json({ error: 'Failed to update resume' });
  }
});

// DELETE /api/resumes/:id - מחיקת קורות חיים
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('resumes')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Resume deleted successfully' });
  } catch (err) {
    console.error('Delete resume error:', err);
    res.status(500).json({ error: 'Failed to delete resume' });
  }
});

// POST /api/resumes/:id/set-default - הגדרת קו"ח כברירת מחדל
router.post('/:id/set-default', async (req, res) => {
  try {
    // איפוס כל קורות החיים הקודמים
    await supabase.from('resumes').update({ is_default: 0 }).eq('user_id', req.user.id);
    
    // הגדרת קורות החיים הנבחרים
    const { error } = await supabase.from('resumes').update({ is_default: 1 }).eq('id', req.params.id).eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Default resume updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set default resume' });
  }
});

// POST /api/resumes/job-analysis/save - שמירת ניתוח משרה
router.post('/job-analysis/save', async (req, res) => {
  try {
    const { resumeId, jobTitle, company, jobDescription, matchPercentage, missingSkills, analysisResult } = req.body;

    const { data: analysis, error: insertError } = await supabase
      .from('job_analyses')
      .insert([{
        user_id: req.user.id,
        resume_id: resumeId || null,
        job_title: jobTitle || null,
        company: company || null,
        job_description: jobDescription,
        match_percentage: matchPercentage || 0,
        missing_skills: JSON.stringify(missingSkills || []),
        analysis_result: JSON.stringify(analysisResult || {})
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    // הענקת XP על ניתוח משרה
    await supabase.from('xp_events').insert([{
      user_id: req.user.id,
      event_type: 'job_analysis',
      xp_gained: 10,
      description: 'Analyzed a job posting'
    }]);

    const { data: user } = await supabase.from('users').select('xp').eq('id', req.user.id).single();
    if (user) {
      await supabase.from('users').update({ xp: (user.xp || 0) + 10 }).eq('id', req.user.id);
    }

    res.status(201).json({ id: analysis.id, message: 'Job analysis saved' });
  } catch (err) {
    console.error('Save job analysis error:', err);
    res.status(500).json({ error: 'Failed to save job analysis' });
  }
});

// GET /api/resumes/job-analyses/list - שליפת היסטוריית ניתוחי משרות
router.get('/job-analyses/list', async (req, res) => {
  try {
    const { data: analyses, error } = await supabase
      .from('job_analyses')
      .select('id, job_title, company, match_percentage, missing_skills, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    // המרת המחרוזות חזרה למערכים
    const formattedAnalyses = (analyses || []).map(a => ({
      ...a,
      missing_skills: JSON.parse(a.missing_skills || '[]')
    }));

    res.json({ analyses: formattedAnalyses });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch job analyses' });
  }
});

module.exports = router;

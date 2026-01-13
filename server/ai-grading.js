// AI Grading and Weakness Spotter API for TutorMate
import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config();

const router = express.Router();

// Access models already compiled in index.js
const getExam = () => mongoose.models.Exam;
const getStudyMaterial = () => mongoose.models.StudyMaterial;

router.post('/grade-theory', async (req, res) => {
  try {
    const { studentImageUrl, idealSolution, maxMarks, studentId, batchId, teacherId, subject, examName, date } = req.body;
    if (!studentImageUrl || !idealSolution || !maxMarks || !studentId || !batchId || !teacherId || !subject) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // Build the system and user prompts as per the premium structure
    const systemPrompt = `You are an expert Math Evaluator and Pedagogy Specialist. Your task is to analyze handwritten student solutions for theory-based mathematics. Compare the student's work against the [Ideal_Solution] provided.\nAnalyze for:\n1. Conceptual Accuracy: Did they use the right formula?\n2. Logical Flow: Is each step a valid deduction from the previous one?\n3. Execution Errors: Did they make a sign error, calculation error, or transcription error?\n\nHandwriting Tolerance: The student may have messy handwriting. Use the context of the mathematical problem to infer ambiguous characters (e.g., if the problem is about 'x', a '2' that looks like a 'z' is likely a '2'). If a character is illegible, look at the line above it. If the line above has 'x', and the current line has a messy character, assume the character is 'x'. Do not penalize for handwriting unless it makes the logic impossible to follow.`;

    const userPrompt = `Here is the [Student_Image]: ${studentImageUrl}\nand the [Ideal_Solution]: ${idealSolution}\n\n1. Grade the work out of ${maxMarks}.\n2. Identify the exact step where the first error occurred.\n3. Categorize the weakness into one of these tags: 'Calculation Error', 'Formula Misuse', 'Incomplete Logic', or 'Conceptual Gap'.\n4. Provide a 1-sentence encouraging feedback for the student.\n\nReturn the response STRICTLY in JSON format:\n{\n  "total_marks_awarded": float,\n  "error_step_description": "string",\n  "weakness_tag": "string",\n  "feedback_to_student": "string",\n  "remedial_topic_suggestion": "string"\n}`;

    // Call Gemini API (replace with your actual Gemini API endpoint and auth)
    const geminiRes = await fetch(process.env.GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });
    const aiResult = await geminiRes.json();
    let parsed;
    try {
      parsed = JSON.parse(aiResult.choices[0].message.content);
    } catch (e) {
      return res.status(500).json({ error: 'AI did not return valid JSON', raw: aiResult });
    }

    // --- AUTOMATE DB: Save to ExamResult/Exam collection ---
    const Exam = getExam();
    const examDoc = new Exam({
      id: `exam_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
      studentId,
      teacherId,
      subject,
      marks: parsed.total_marks_awarded,
      totalMarks: maxMarks,
      examName: examName || 'AI Graded Theory',
      date: date || new Date().toISOString(),
      remarks: parsed.error_step_description,
      marksheetUrl: studentImageUrl,
      aiWeaknessTag: parsed.weakness_tag,
      aiFeedback: parsed.feedback_to_student,
      aiRemedial: parsed.remedial_topic_suggestion
    });
    await examDoc.save();

    // --- AUTOMATE LMS: Unlock remedial video/material for weakness_tag ---
    // Find a StudyMaterial for this batch/subject/weakness_tag (type: video)
    const StudyMaterial = getStudyMaterial();
    const remedial = await StudyMaterial.findOne({
      batchId,
      subject,
      type: 'video',
      title: { $regex: parsed.weakness_tag, $options: 'i' }
    });
    let remedialUnlocked = false;
    if (remedial) {
      // Here, you would update a StudentMaterialUnlocks collection, or similar
      // For demo, just set remedialUnlocked = true
      remedialUnlocked = true;
    }

    res.json({ ...parsed, examId: examDoc.id, remedialUnlocked, remedialVideo: remedial?.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

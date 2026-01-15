import multer from 'multer';
import mammoth from 'mammoth';
import * as pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// AI Grading and Weakness Spotter API for TutorMate
import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { sendEmail } from './index.js';
dotenv.config();

const router = express.Router();

// Access models already compiled in index.js
const getExam = () => mongoose.models.Exam;
const getStudyMaterial = () => mongoose.models.StudyMaterial;

router.post('/grade-theory', upload.any(), async (req, res) => {
  try {
    const { maxMarks, studentId, batchId, teacherId, subject, examName, date } = req.body;
    if (!maxMarks || !studentId || !batchId || !teacherId || !subject) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // --- Extract text from uploaded files ---
    async function extractText(file) {
      if (!file) return '';
      const mime = file.mimetype;
      if (mime === 'application/pdf') {
        // PDF
        const data = await pdfParse(file.buffer);
        return data.text;
      } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // DOCX
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        return result.value;
      } else if (mime.startsWith('image/')) {
        // Image
        const { data: { text } } = await Tesseract.recognize(file.buffer, 'eng');
        return text;
      } else {
        throw new Error('Unsupported file type: ' + mime);
      }
    }

    // Find answer and solution files by inspecting req.files
    let studentFile = req.files?.find(f =>
      ['studentAnswer', 'answer', 'studentFile'].includes(f.fieldname)
    ) || req.files?.[0]; // fallback to first file
    let solutionFile = req.files?.find(f =>
      ['idealSolution', 'solution', 'solutionFile'].includes(f.fieldname)
    ) || req.files?.[1]; // fallback to second file

    let studentAnswerText = '';
    let idealSolutionText = '';
    let studentAnswerUrl = '';
    let idealSolutionUrl = '';
    if (studentFile) {
      studentAnswerText = await extractText(studentFile);
      studentAnswerUrl = studentFile.originalname;
    } else if (req.body.studentAnswerText) {
      studentAnswerText = req.body.studentAnswerText;
    }
    if (solutionFile) {
      idealSolutionText = await extractText(solutionFile);
      idealSolutionUrl = solutionFile.originalname;
    } else if (req.body.idealSolutionText) {
      idealSolutionText = req.body.idealSolutionText;
    }
    if (!studentAnswerText.trim() || !idealSolutionText.trim()) {
      return res.status(400).json({ error: 'Both student answer and ideal solution must contain text.' });
    }


    // Build the system and user prompts for extracted text
    const systemPrompt = `You are an expert Math Evaluator and Pedagogy Specialist. Your task is to analyze student solutions for theory-based mathematics. Compare the student's work against the [Ideal_Solution] provided.\nAnalyze for:\n1. Conceptual Accuracy: Did they use the right formula?\n2. Logical Flow: Is each step a valid deduction from the previous one?\n3. Execution Errors: Did they make a sign error, calculation error, or transcription error?`;

    const userPrompt = `Here is the [Student_Answer]:\n${studentAnswerText}\n\nHere is the [Ideal_Solution]:\n${idealSolutionText}\n\n1. Grade the work out of ${maxMarks}.\n2. Identify the exact step where the first error occurred.\n3. Categorize the weakness into one of these tags: 'Calculation Error', 'Formula Misuse', 'Incomplete Logic', or 'Conceptual Gap'.\n4. Provide a 1-sentence encouraging feedback for the student.\n\nReturn the response STRICTLY in JSON format:\n{\n  "total_marks_awarded": float,\n  "error_step_description": "string",\n  "weakness_tag": "string",\n  "feedback_to_student": "string",\n  "remedial_topic_suggestion": "string"\n}`;


    // Call Gemini 1.5 Pro API for AI grading
    const geminiUrl = `${process.env.GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`;
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${systemPrompt}\n\n${userPrompt}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 1024
        }
      })
    });
    const aiResult = await geminiRes.json();
    // Debug: Log Gemini raw response
    console.log('Gemini API Raw Response:', JSON.stringify(aiResult, null, 2));
    let parsed;
    try {
      // Gemini API returns response in candidates array
      const responseText = aiResult.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) {
        return res.status(500).json({ error: 'No response from Gemini', raw: aiResult });
      }
      parsed = JSON.parse(responseText);
      // Defensive: If marks awarded is always maxMarks or feedback is generic, flag it
      if (
        (!parsed.total_marks_awarded && parsed.total_marks_awarded !== 0) ||
        typeof parsed.total_marks_awarded !== 'number' ||
        parsed.total_marks_awarded > Number(maxMarks) ||
        parsed.feedback_to_student?.toLowerCase().includes('sample feedback')
      ) {
        console.warn('Suspicious AI grading result:', parsed);
      }
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
      marksheetUrl: studentAnswerUrl,
      aiWeaknessTag: parsed.weakness_tag,
      aiFeedback: parsed.feedback_to_student,
      aiRemedial: parsed.remedial_topic_suggestion
    });
    await examDoc.save();


    // --- AUTOMATE EMAIL TO STUDENT/PARENT ---
    // Find student by studentId
    const Student = mongoose.models.Student;
    const student = await Student.findOne({ id: studentId });
    if (student && student.email) {
      const emailSubject = `AI Grading Result for ${student.name}`;
      const emailBody = `Dear ${student.parentName || student.name},\n\nYour recent theory paper has been graded by AI.\n\nMarks Awarded: ${parsed.total_marks_awarded} / ${maxMarks}\nError Step: ${parsed.error_step_description}\nWeakness: ${parsed.weakness_tag}\nFeedback: ${parsed.feedback_to_student}\nRemedial Topic: ${parsed.remedial_topic_suggestion}\n\nBest regards,\nTutorMate`;
      await sendEmail(student.email, emailSubject, emailBody);
    }

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

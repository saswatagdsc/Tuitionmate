// Parent Weekly Report Automation for TutorMate
import express from 'express';
import fetch from 'node-fetch';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// Access models already compiled in index.js
const getStudent = () => mongoose.models.Student;
const getExam = () => mongoose.models.Exam;
const getAttendance = () => mongoose.models.Attendance;

// Helper: Generate executive summary via Gemini
async function generateParentSummary(student, attendancePct, avgScore, weaknessTag) {
  const prompt = `Based on the last 7 days of data for Student ${student.name}:
* Attendance: ${attendancePct}%
* Average Score: ${avgScore}%
* Primary Weakness Detected: ${weaknessTag}

Write a 3-sentence 'Executive Summary' for a parent.
* Sentence 1: A positive achievement from this week.
* Sentence 2: The specific technical hurdle the child is facing.
* Sentence 3: What the TutorMate system has done to fix it (e.g., 'Assigned a remedial video on Algebra').

Tone: Professional, data-driven, and reassuring.`;
  const geminiRes = await fetch(process.env.GEMINI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  });
  const aiResult = await geminiRes.json();
  return aiResult.choices?.[0]?.message?.content || 'No summary generated.';
}

// POST /api/reports/send-parent-report (manual trigger)
// Import sendEmail from main server
import path from 'path';
import fs from 'fs';
let sendEmail = null;
try {
  // Dynamically require to avoid circular import
  const mainPath = path.join(__dirname || process.cwd(), 'index.js');
  if (fs.existsSync(mainPath)) {
    sendEmail = require(mainPath).sendEmail;
  }
} catch {}

router.post('/send-parent-report', async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ error: 'studentId required' });
    const student = await Student.findOne({ id: studentId });
    if (!student || !student.email) return res.status(404).json({ error: 'Student or parent email not found' });
    // Aggregate last 7 days
    const since = new Date(Date.now() - 7*24*60*60*1000);
    // Attendance
    const Attendance = getAttendance();
    const attendanceRecords = await Attendance.find({
      'records.studentId': studentId,
      date: { $gte: since.toISOString().slice(0,10) }
    });
    let attended = 0, total = 0;
    attendanceRecords.forEach(r => {
      r.records.forEach(rec => {
        if (rec.studentId === studentId) {
          total++;
          if (rec.status === 'present') attended++;
        }
      });
    });
    const attendancePct = total ? Math.round((attended/total)*100) : 0;
    // Exams
    const Exam = getExam();
    const exams = await Exam.find({ studentId, date: { $gte: since.toISOString() } });
    const avgScore = exams.length ? Math.round(100 * exams.reduce((a,e)=>a+e.marks/e.totalMarks,0)/exams.length) : 0;
    const weaknessTag = exams.length ? exams[0].aiWeaknessTag || 'None' : 'None';
    // Generate summary
    const summary = await generateParentSummary(student, attendancePct, avgScore, weaknessTag);
    // Send email
    if (sendEmail) {
      await sendEmail(student.email, `Weekly Progress Report for ${student.name}`, summary);
    }
    res.json({ email: student.email, summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Export for scheduler use
export async function sendParentReportById(studentId) {
  const Student = getStudent();
  const student = await Student.findOne({ id: studentId });
  if (!student || !student.email) return;
  const since = new Date(Date.now() - 7*24*60*60*1000);
  const Attendance = getAttendance();
  const attendanceRecords = await Attendance.find({
    'records.studentId': studentId,
    date: { $gte: since.toISOString().slice(0,10) }
  });
  let attended = 0, total = 0;
  attendanceRecords.forEach(r => {
    r.records.forEach(rec => {
      if (rec.studentId === studentId) {
        total++;
        if (rec.status === 'present') attended++;
      }
    });
  });
  const attendancePct = total ? Math.round((attended/total)*100) : 0;
  const Exam = getExam();
  const exams = await Exam.find({ studentId, date: { $gte: since.toISOString() } });
  const avgScore = exams.length ? Math.round(100 * exams.reduce((a,e)=>a+e.marks/e.totalMarks,0)/exams.length) : 0;
  const weaknessTag = exams.length ? exams[0].aiWeaknessTag || 'None' : 'None';
  const summary = await generateParentSummary(student, attendancePct, avgScore, weaknessTag);
  if (sendEmail) {
    await sendEmail(student.email, `Weekly Progress Report for ${student.name}`, summary);
  }
}

export default router;

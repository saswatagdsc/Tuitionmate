// Export Attendance, Student, Batch, and sendEmail for attendanceReport.js and ai-grading.js
export { Attendance, Student, Batch, sendEmail };
// --- Cloudinary Setup ---
import { v2 as cloudinary } from 'cloudinary';
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import fetch from 'node-fetch';
import { generateAttendanceCSV } from './attendanceReport.js';
import aiGradingRouter from './ai-grading.js';
import parentReportRouter, { sendParentReportById } from './parent-report.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });


const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Mount AI Grading API
app.use('/api/ai', aiGradingRouter);
// Mount Parent Report API
app.use('/api/reports', parentReportRouter);

// --- Weekly Parent Report Scheduler (runs every Monday 7am) ---
import cron from 'node-cron';
cron.schedule('0 7 * * 1', async () => {
  // Find all students with parent email
  const Student = mongoose.models.Student || mongoose.model('Student');
  const students = await Student.find({ email: { $exists: true, $ne: '' } });
  for (const student of students) {
    try {
      await sendParentReportById(student.id);
      console.log(`[Weekly Report] Sent to parent of ${student.name} (${student.email})`);
    } catch (e) {
      console.error('Weekly parent report error:', e.message);
    }
  }
});

// --- Email via Resend API ---
// Set RESEND_API_KEY and RESEND_FROM_EMAIL in your environment
const sendEmail = async (to, subject, text) => {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    console.log(`[SIMULATED EMAIL] To: ${to} | Subject: ${subject} | Body: ${text}`);
    return true;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to,
        subject,
        text
      })
    });
    if (res.ok) {
      console.log(`Email sent to ${to}: ${subject}`);
      return true;
    } else {
      const err = await res.text();
      console.error('Resend API error:', err);
      return false;
    }
  } catch (e) {
    console.error('Email send failed:', e);
    return false;
  }
};



// Track IP for login attempts (in-memory)
const ipBlockList = new Map(); // ip -> { count, lockUntil }

// Enhanced CORS configuration for both web and mobile app
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests from:
    // 1. No origin (mobile apps, curl, etc.)
    // 2. localhost and 127.0.0.1 (dev)
    // 3. Any explicitly provided origin
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'capacitor://localhost',
      'ionic://localhost',
      'https://app.mondalsirmaths.in'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS request from:', origin);
      callback(null, true); // Allow all for mobile app compatibility
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Connect to MongoDB
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not set in .env file.");
  process.exit(1);
}

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB via Mongoose');

    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`API server running on http://localhost:${PORT}`);
      // Start the auto-fee generation interval (runs once on start, then daily)
      autoGenerateFees();
      setInterval(autoGenerateFees, 24 * 60 * 60 * 1000);
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB. Server not started.');
    console.error('Error:', err.message);
    if (err.message.includes('whitelisted')) {
         console.error('\n🔴 ACTION REQUIRED: Your IP address is not whitelisted in MongoDB Atlas.');
         console.error('👉 Go to Network Access in Atlas and add your current IP (or 0.0.0.0/0 for all).\n');
    }
    process.exit(1);
  }
};

startServer();

// --- Schemas & Models ---

const studentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  rollNo: String,
  class: String,
  parentName: String,
  phone: String,
  email: { type: String, required: true },
  passwordHash: { type: String },
  teacherId: { type: String, required: true },
  batchIds: [String],
  archived: { type: Boolean, default: false },
  // Fee configuration
  monthlyFee: Number, // Agreed monthly fee amount
  feePolicy: { type: String, enum: ['advance', 'pay-after-study'], default: 'advance' },
  joinDate: String, // When student joined
  isActive: { type: Boolean, default: true }
});

const batchSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true }, // Removed unique:true to allow same batch names for different teachers
  teacherId: { type: String, required: true, index: true },
  subject: String,
  days: [String],
  time: String,
  sessionDurationMinutes: Number, // Duration of each class session in minutes
  slots: mongoose.Schema.Types.Mixed, // Array of { id, day, time, duration }
  color: String,
  schedule: String
});

const attendanceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, 
  teacherId: { type: String, required: true, index: true },
  batchId: String,
  date: String,
  records: mongoose.Schema.Types.Mixed // Array of { studentId, status }
});

const feeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  teacherId: { type: String, required: true, index: true },
  studentId: String,
  title: String,
  amount: Number,
  type: String, // 'monthly', 'one-time', 'package', etc.
  description: String,
  month: String, // Month name e.g. "January"
  year: Number, // Year e.g. 2025
  dueDate: String,
  status: { type: String, default: 'pending' },
  paidOn: String,
  // Indian tuition specific
  feePolicy: { type: String, enum: ['advance', 'pay-after-study'], default: 'advance' },
  isFirstMonth: { type: Boolean, default: false },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

const paymentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  feeId: String,
  amount: Number,
  date: String,
  method: String,
  note: String
});

const examSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  teacherId: { type: String, required: true, index: true },
  studentId: String,
  subject: String,
  marks: Number,
  totalMarks: Number,
  examName: String,
  date: String,
  remarks: String,
  marksheetUrl: String
});

const messageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  teacherId: { type: String, required: true, index: true },
  senderId: String,
  senderName: String,
  batchId: String,
  receiverId: String,
  text: String,
  content: String,
  timestamp: String,
  read: Boolean,
  role: String
});

const noticeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  teacherId: { type: String, required: true, index: true },
  title: String,
  content: String,
  date: String,
  audience: String,
  batchId: String
});

const enquirySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  teacherId: { type: String, required: true, index: true },
  studentName: String,
  parentName: String,
  phone: String,
  class: String,
  status: String,
  notes: [String],
  date: String,
  followUpDate: String,
  source: String
});

const expenseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  teacherId: { type: String, required: true, index: true },
  title: String,
  amount: Number,
  category: String,
  date: String,
  receiptUrl: String,
  notes: String
});

const materialSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  teacherId: { type: String, required: true, index: true },
  title: String,
  subject: String,
  class: String,
  type: String,
  url: String, // User mentioned "upload", we store URL here
  uploadDate: String
});

const holidaySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  teacherId: { type: String, required: true, index: true },
  name: String,
  startDate: String,
  endDate: String,
  type: String
});

const settingsSchema = new mongoose.Schema({
  id: { type: String, required: true }, // Not unique globally anymore, maybe unique per teacher? Or just random ID.
  teacherId: { type: String, required: true, index: true },
  name: String,
  logo: String,
  address: String,
  primaryColor: String,
  accentColor: String,
  academicYear: String
});

const agentPlanSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  teacherId: { type: String, required: true, index: true },
  classGrade: String,
  subject: String,
  board: String,
  syllabus: String,
  startDate: String,
  examDate: String, // Added: Exam target date
  teachingFrequency: String,
  sessionDuration: String,
  // Tracking Metrics
  currentSyllabusCompletion: { type: Number, default: 0 },
  currentRiskLevel: { type: String, default: 'Low' }, // Low, Medium, High
  weeksRemaining: Number,
  
  weeklyPlans: [{
    weekNumber: Number,
    startDate: String,
    endDate: String,
    objectives: String,
    teachingFlow: String,
    assignments: String,
    assessmentPlan: String,
    revisionStrategy: String,
    emailContent: String,
    riskAnalysis: String,
    status: { type: String, default: 'pending' },
    generatedAt: String
  }],
  status: { type: String, default: 'active' },
  lastUpdated: { type: String }
});

const AuthUser = mongoose.model('AuthUser', authUserSchema);
const Student = mongoose.model('Student', studentSchema);
const Batch = mongoose.model('Batch', batchSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);
const Fee = mongoose.model('Fee', feeSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const Exam = mongoose.model('Exam', examSchema);
const Message = mongoose.model('Message', messageSchema);
const Notice = mongoose.model('Notice', noticeSchema);
const Enquiry = mongoose.model('Enquiry', enquirySchema);
const Expense = mongoose.model('Expense', expenseSchema);
const Material = mongoose.model('Material', materialSchema);
const Holiday = mongoose.model('Holiday', holidaySchema);
const Settings = mongoose.model('Settings', settingsSchema);
const AgentPlan = mongoose.model('AgentPlan', agentPlanSchema);

// --- Helpers ---
// Removes _id and __v from response to match frontend interface
const clean = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  delete obj._id;
  delete obj.__v;
  return obj;
};
const cleanList = (docs) => docs.map(clean);

// --- API Endpoints ---

// Admin: Add Teacher
app.post('/api/admin/teachers', async (req, res) => {
  try {
    const { name, email } = req.body;
    
    // Check if email exists
    const existing = await AuthUser.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already exists" });

    // Generate random password
    const password = Math.random().toString(36).slice(-8);
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const teacher = new AuthUser({
        id: `t${Date.now()}`,
        email,
        passwordHash: hash,
        role: 'teacher',
        name
    });

    await teacher.save();

    // Send credentials via email
    const subject = "Welcome to TutorMate - Teacher Access";
    const text = `Hello ${name},\n\nYou have been granted teacher access to TutorMate.\n\nLogin Credentials:\nEmail: ${email}\nPassword: ${password}\n\nPlease change your password after logging in.\n\nRegards,\nAdmin Team`;
    
    await sendEmail(email, subject, text);

    res.json({ message: "Teacher created successfully", teacher: clean(teacher) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: Delete Teacher (Cascading)
app.delete('/api/admin/teachers/:id', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const teacher = await AuthUser.findOneAndDelete({ id, role: 'teacher' }).session(session);

    if (!teacher) {
        await session.abortTransaction();
        return res.status(404).json({ error: "Teacher not found" });
    }

    // Cascading Delete of ALL teacher data
    await Promise.all([
        Student.deleteMany({ teacherId: id }).session(session),
        Batch.deleteMany({ teacherId: id }).session(session),
        Attendance.deleteMany({ teacherId: id }).session(session),
        Fee.deleteMany({ teacherId: id }).session(session),
        Exam.deleteMany({ teacherId: id }).session(session),
        Message.deleteMany({ teacherId: id }).session(session),
        Notice.deleteMany({ teacherId: id }).session(session),
        Enquiry.deleteMany({ teacherId: id }).session(session),
        Expense.deleteMany({ teacherId: id }).session(session),
        Material.deleteMany({ teacherId: id }).session(session),
        Holiday.deleteMany({ teacherId: id }).session(session),
        Settings.deleteMany({ teacherId: id }).session(session)
    ]);

    await session.commitTransaction();
    console.log(`[Admin] Deleted teacher ${id} and all related data.`);
    res.json({ success: true });
  } catch (e) {
    await session.abortTransaction();
    console.error("[Admin] Delete teacher error:", e);
    res.status(500).json({ error: e.message });
  } finally {
    session.endSession();
  }
});

// Admin: Freeze/Unfreeze Teacher
app.patch('/api/admin/teachers/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { isFrozen } = req.body; // Expect boolean

        const teacher = await AuthUser.findOneAndUpdate(
            { id, role: 'teacher' },
            { isFrozen },
            { new: true }
        );

        if (!teacher) return res.status(404).json({ error: "Teacher not found" });
        
        console.log(`[Admin] Teacher ${id} frozen status set to ${isFrozen}`);
        res.json(clean(teacher));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Admin Dashboard Route
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    // In a real app, verify admin session/token here
    
    // 1. Stats
    const totalTeachers = await AuthUser.countDocuments({ role: 'teacher' });
    const totalStudents = await Student.countDocuments();
    const totalBatches = await Batch.countDocuments();
    
    // 2. Teachers List
      let teachersRaw, studentsRaw;
      if (req.query.role === 'superadmin') {
        teachersRaw = await AuthUser.find({ role: 'teacher' });
        studentsRaw = await Student.find();
      } else {
        teachersRaw = await AuthUser.find({ role: 'teacher', isFrozen: false });
        studentsRaw = await Student.find({ isFrozen: { $ne: true }, archived: { $ne: true } });
      }
      const teachers = await Promise.all(teachersRaw.map(async (t) => {
         const sCount = await Student.countDocuments({ teacherId: t.id });
         const bCount = await Batch.countDocuments({ teacherId: t.id }); 
         return {
           id: t.id,
           name: t.name || 'Unknown',
           email: t.email,
           isFrozen: t.isFrozen || false, // Include status
           studentCount: sCount,
           batchCount: bCount, 
           joinedDate: t._id.getTimestamp(), // Mongo ObjectId has timestamp
         };
      }));
      res.json({
        stats: {
          totalTeachers,
          totalStudents,
          totalBatches,
          activeSubscriptions: totalTeachers, // For now assuming all active
          systemHealth: 'Healthy'
        },
        teachers,
        students: studentsRaw
      });

  } catch (e) {
    console.error("Admin Dashboard Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));


// Students
app.get('/api/students', async (req, res) => {
  try {
    const { teacherId } = req.query;
    const filter = teacherId ? { teacherId } : {};
    const students = await Student.find(filter);
    res.json(cleanList(students));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/students', async (req, res) => {
  try {
    const { email, name, teacherId } = req.body;
    
    // Check if student email already exists
    const existing = await Student.findOne({ email });
    if (existing) return res.status(400).json({ error: "Student with this email already exists." });

    // Generate random password
    const rawPassword = Math.random().toString(36).slice(-8);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    const student = new Student({
        ...req.body,
        passwordHash
    });
    
    await student.save();

    // Send credentials via email
    const subject = "Welcome to TutorMate - Login Credentials";
    const text = `Hello ${name},\n\nYour profile has been created by your teacher.\n\nYou can login to the student portal using the following credentials:\n\nEmail: ${email}\nPassword: ${rawPassword}\n\nPlease change your password after logging in.\n\nBest regards,\nTutorMate Team`;
    
    await sendEmail(email, subject, text);

    res.json(clean(student));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.patch('/api/students/:id', async (req, res) => {
  try {
    const student = await Student.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    if (!student) return res.status(404).json({ error: 'Not found' });
    
    // If student is being archived, stop future payment requests (remove unpaid fees)
    if (req.body.archived === true) {
       await Fee.deleteMany({ studentId: req.params.id, status: { $ne: 'paid' } });
    }

    res.json(clean(student));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/students/:id', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const student = await Student.findOneAndDelete({ id }).session(session);
    
    if (!student) {
        await session.abortTransaction();
        return res.status(404).json({ error: "Student not found" });
    }

    // Stop future payment requests: Remove all unpaid fees for this student
    // We keep 'paid' fees for accounting history.
    await Fee.deleteMany({ studentId: id, status: { $ne: 'paid' } }).session(session);

    await session.commitTransaction();
    res.json({ success: true });
  } catch (e) { 
    await session.abortTransaction();
    res.status(500).json({ error: e.message }); 
  } finally {
    session.endSession();
  }
});

// Batches
app.get('/api/batches', async (req, res) => {
  try {
    const { teacherId } = req.query;
    const filter = teacherId ? { teacherId } : {};
    const batches = await Batch.find(filter);
    console.log('Fetched batches from DB:', batches.length, 'batches', teacherId ? `for teacher ${teacherId}` : '(all)');
    res.json(cleanList(batches));
  } catch (e) { 
    console.error('Error fetching batches:', e.message);
    res.status(500).json({ error: e.message }); 
  }
});
app.post('/api/batches', async (req, res) => {
  try {
    const batchData = {
      ...req.body,
      id: req.body.id || new mongoose.Types.ObjectId().toString() // Generate unique ID if not provided
    };
    console.log('Creating batch with ID:', batchData.id, 'Name:', batchData.name, 'Teacher:', batchData.teacherId);
    if (!batchData.teacherId) return res.status(400).json({ error: 'teacherId is required' });
    const batch = new Batch(batchData);
    await batch.save();
    console.log('Batch saved successfully:', batchData.id);
    res.json(clean(batch));
  } catch (e) { 
    console.error('Batch creation error:', e.message);
    res.status(500).json({ error: e.message }); 
  }
});
app.patch('/api/batches/:id', async (req, res) => {
  try {
    const batch = await Batch.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    if (!batch) return res.status(404).json({ error: 'Not found' });
    res.json(clean(batch));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/batches/:id', async (req, res) => {
  try {
    console.log('Attempting to delete batch with ID:', req.params.id);
    const deleted = await Batch.findOneAndDelete({ id: req.params.id });
    if (!deleted) {
      console.log('Batch not found for deletion:', req.params.id);
      return res.status(404).json({ error: 'Batch not found' });
    }
    console.log('Successfully deleted batch:', req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (e) { 
    console.error('Delete batch error:', e.message);
    res.status(500).json({ error: e.message }); 
  }
});

// Attendance
app.get('/api/attendance', async (req, res) => {
  try {
    const { teacherId } = req.query;
    const filter = teacherId ? { teacherId } : {};
    const records = await Attendance.find(filter);
    res.json(cleanList(records));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/attendance', async (req, res) => {
  try {
    const data = req.body;
    if (!data.teacherId) return res.status(400).json({ error: 'teacherId is required' });
    // Generate UUID if not present (frontend sometimes sends ID, sometimes not?)
    // Store implementation seems to rely on backend for ID if separate? 
    // Wait, Store.tsx: markAttendance uses existing or creates new.
    // If we receive an ID, use it. If not, generate one.
    if (!data.id) {
       data.id = new mongoose.Types.ObjectId().toString(); // Use Mongo ObjectId as string for simplicity
    }
    const record = new Attendance(data);
    await record.save();
    res.json(clean(record));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Attendance Report Download (CSV)
app.get('/api/attendance/report', async (req, res) => {
  try {
    const { studentId, batchId, from, to } = req.query;
    if (!studentId && !batchId) return res.status(400).json({ error: 'studentId or batchId required' });
    // Default: last 1 year
    let fromDate = from;
    let toDate = to;
    if (!fromDate) {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      fromDate = d.toISOString().split('T')[0];
    }
    if (!toDate) {
      toDate = new Date().toISOString().split('T')[0];
    }
    const csv = await generateAttendanceCSV({ studentId, batchId, from: fromDate, to: toDate });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance_report.csv"');
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Fees
app.get('/api/fees', async (req, res) => {
  try {
    const { teacherId } = req.query;
    console.log(`[GET /api/fees] Fetching fees. TeacherId param: '${teacherId}'`);
    
    // STRICT filtering: Only missing param allows global fetch (Admin).
    // "undefined" string means client tried to filter but failed -> match nothing.
    const filter = teacherId ? { teacherId } : {};
    console.log(`[GET /api/fees] Mongo Filter:`, filter);

    const fees = await Fee.find(filter).lean();
    console.log(`[GET /api/fees] Found ${fees.length} fees`);
    
    // We only want payments for the fees we fetched
    const feeIds = fees.map(f => f.id);
    const payments = await Payment.find({ feeId: { $in: feeIds } }).lean();
    
    // Embed payments into fee objects
    const result = fees.map(f => {
      const myPayments = payments.filter(p => p.feeId === f.id);
      return { ...clean(f), payments: cleanList(myPayments) };
    });
    
    res.json(result);
  } catch (e) { 
      console.error("[GET /api/fees] Error:", e);
      res.status(500).json({ error: e.message }); 
  }
});
app.post('/api/fees', async (req, res) => {
  try {
    console.log("[POST /api/fees] Creating fee. Body:", req.body);
    if (!req.body.teacherId) {
        console.error("[POST /api/fees] Missing teacherId!");
        return res.status(400).json({ error: 'teacherId is required' });
    }
    const fee = new Fee(req.body);
    await fee.save();
    console.log("[POST /api/fees] Fee saved:", fee.id);
    res.json(clean(fee));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.patch('/api/fees/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    // Update logic: if paying, set paidOn date if not set
    const fee = await Fee.findOne({ id: req.params.id });
    if (!fee) return res.status(404).json({ error: 'Not found' });
    
    const paidOn = status === 'paid' ? new Date().toISOString().split('T')[0] : fee.paidOn;
    fee.status = status;
    fee.paidOn = paidOn;
    await fee.save();
    
    res.json(clean(fee));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/fees/:id/payments', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params; // feeId
    const { id: pId, amount, date, method, note } = req.body;

    const fee = await Fee.findOne({ id }).session(session);
    if (!fee) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Fee not found' });
    }

    const payment = new Payment({ id: pId, feeId: id, amount, date, method, note });
    await payment.save({ session });

    // Calculate total paid
    const allPayments = await Payment.find({ feeId: id }).session(session);
    const totalPaid = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Update Fee Status
    const today = new Date().toISOString().split('T')[0];
    const isPaid = totalPaid >= fee.amount;
    const newStatus = isPaid ? 'paid' : (today > fee.dueDate ? 'overdue' : 'pending');

    fee.status = newStatus;
    if (isPaid && !fee.paidOn) fee.paidOn = date;
    await fee.save({ session });

    await session.commitTransaction();
    res.json({ payment: clean(payment), fee: clean(fee) });
  } catch (e) {
    await session.abortTransaction();
    res.status(500).json({ error: e.message });
  } finally {
    session.endSession();
  }
});
app.delete('/api/fees/:id', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const fee = await Fee.findOne({ id: req.params.id }).session(session);
    if (!fee) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Fee not found' });
    }

    // Never delete paid fees; keep history
    if (fee.status === 'paid') {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Paid fees cannot be deleted' });
    }

    await Fee.deleteOne({ id: req.params.id }).session(session);
    await Payment.deleteMany({ feeId: req.params.id }).session(session);
    await session.commitTransaction();
    res.json({ success: true });
  } catch (e) { 
    await session.abortTransaction();
    res.status(500).json({ error: e.message }); 
  } finally {
    session.endSession();
  }
});

// Generate monthly fees for all active students for a given month/year
// POST /api/fees/generate-monthly { month: 'January', year: 2025 }
app.post('/api/fees/generate-monthly', async (req, res) => {
  try {
    const { month, year, teacherId } = req.body;
    if (!month || !year || !teacherId) {
      return res.status(400).json({ error: 'month, year and teacherId are required' });
    }

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthIndex = monthNames.indexOf(month);
    if (monthIndex === -1) {
      return res.status(400).json({ error: 'Invalid month name' });
    }

    // Get all active students with a monthly fee configured for this teacher
    const students = await Student.find({ teacherId, isActive: { $ne: false }, archived: { $ne: true }, monthlyFee: { $gt: 0 } });
    
    const createdFees = [];
    const skipped = [];

    for (const student of students) {
      // Check if fee already exists for this student/month/year
      const existing = await Fee.findOne({ teacherId, studentId: student.id, month, year, type: 'monthly' });
      if (existing) {
        skipped.push({ studentId: student.id, reason: 'Fee already exists' });
        continue;
      }

      // Calculate due date based on fee policy
      const joinDate = student.joinDate ? new Date(student.joinDate) : null;
      const isFirstMonth = joinDate && joinDate.getMonth() === monthIndex && joinDate.getFullYear() === year;
      const feePolicy = student.feePolicy || 'advance';

      let dueDate;
      if (feePolicy === 'pay-after-study' && isFirstMonth) {
        // Due on 10th of NEXT month for pay-after-study first month
        const nextMonthIndex = (monthIndex + 1) % 12;
        const nextYear = monthIndex === 11 ? year + 1 : year;
        dueDate = `${nextYear}-${String(nextMonthIndex + 1).padStart(2, '0')}-10`;
      } else {
        // Normal advance: due on 10th of same month
        dueDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-10`;
      }

      const fee = new Fee({
        id: `f${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        teacherId,
        studentId: student.id,
        title: `${month} ${year} Monthly Fee`,
        amount: student.monthlyFee,
        type: 'monthly',
        month,
        year,
        dueDate,
        status: 'pending',
        feePolicy,
        isFirstMonth: isFirstMonth || false,
        createdAt: new Date().toISOString()
      });

      await fee.save();
      createdFees.push(clean(fee));
    }

    res.json({ created: createdFees.length, skipped: skipped.length, fees: createdFees });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Exams
app.get('/api/exams', async (req, res) => {
  try {
    const { teacherId } = req.query;
    const filter = teacherId ? { teacherId } : {};
    const exams = await Exam.find(filter);
    res.json(cleanList(exams));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// --- Multer for file upload (Memory storage for Vercel compatibility) ---
import multer from 'multer';
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit for marksheets
});

// Result declaration endpoint
app.post('/api/exams', upload.single('marksheet'), async (req, res) => {
  try {
    const { teacherId, studentId, subject, marks, totalMarks, examName, date, remarks } = req.body;
    if (!teacherId) return res.status(400).json({ error: 'teacherId is required' });
    if (!studentId) return res.status(400).json({ error: 'studentId is required' });

    // Find student for email
    const student = await Student.findOne({ id: studentId });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    let marksheetUrl = '';
    if (req.file) {
      // Enforce file size limit (5MB) - multer already enforces this, but double check
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'File too large. Max 5MB allowed.' });
      }
      
      // Upload to Cloudinary directly from memory buffer
      try {
        console.log('Uploading marksheet to Cloudinary from memory buffer:', req.file.originalname);
        
        // Use stream upload for buffer
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { 
              folder: 'marksheets',
              resource_type: 'auto',
              public_id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(req.file.buffer);
        });
        
        marksheetUrl = uploadResult.secure_url;
        console.log('Marksheet upload successful:', marksheetUrl);
      } catch (err) {
        console.error('Cloudinary upload error:', err);
        return res.status(500).json({ error: 'Cloudinary upload failed: ' + err.message });
      }
    }

    const exam = new Exam({
      id: `exam_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
      teacherId,
      studentId,
      subject,
      marks,
      totalMarks,
      examName,
      date,
      remarks,
      marksheetUrl
    });
    await exam.save();

    // Send email to student
    let emailText = `Dear ${student.name},\n\nYour result for ${examName} (${subject}) has been declared.\nMarks: ${marks}/${totalMarks}`;
    if (remarks) emailText += `\nRemarks: ${remarks}`;
    if (marksheetUrl) emailText += `\nYou can download your marksheet here: ${marksheetUrl}`;
    emailText += '\n\nRegards,\nTutorMate';
    await sendEmail(student.email, `Result Declared: ${examName}`, emailText);

    res.json(clean(exam));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/exams/:id', async (req, res) => {
  try {
    await Exam.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Messages
app.get('/api/messages', async (req, res) => {
  try {
    const { teacherId } = req.query;
    const filter = teacherId ? { teacherId } : {};
    const msgs = await Message.find(filter);
    res.json(cleanList(msgs));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/messages', async (req, res) => {
  try {
    if (!req.body.teacherId) return res.status(400).json({ error: 'teacherId is required' });
    const msg = new Message(req.body);
    await msg.save();
    res.json(clean(msg));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Notices
// Notices: GET filters for students by batchId, POST sends email to batch
app.get('/api/notices', async (req, res) => {
  try {
    const { teacherId, batchId, role } = req.query;
    let filter = {};
    if (teacherId) filter.teacherId = teacherId;
    if (role === 'student' && batchId) {
      // Student: show notices for their batch or 'all'
      filter['$or'] = [ { batchId: batchId }, { batchId: 'all' }, { batchId: null }, { batchId: undefined } ];
    }
    const notices = await Notice.find(filter);
    res.json(cleanList(notices));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/notices', async (req, res) => {
  try {
    if (!req.body.teacherId) return res.status(400).json({ error: 'teacherId is required' });
    // Always set teacherId
    const notice = new Notice({ ...req.body, teacherId: req.body.teacherId });
    await notice.save();

    // Notify students in batch (if batchId is not 'all')
    if (notice.batchId && notice.batchId !== 'all') {
      const students = await Student.find({ batchIds: notice.batchId });
      for (const student of students) {
        if (student.email) {
          let emailText = `Dear ${student.name},\n\nNew notice: ${notice.title}\n${notice.content}\n\nRegards, TutorMate`;
          await sendEmail(student.email, `New Notice: ${notice.title}`, emailText);
        }
      }
    }
    res.json(clean(notice));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete notice
app.delete('/api/notices/:id', async (req, res) => {
  try {
    await Notice.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Enquiries
app.get('/api/enquiries', async (req, res) => {
  try {
    const { teacherId } = req.query;
    const filter = teacherId ? { teacherId } : {};
    const enquiries = await Enquiry.find(filter);
    res.json(cleanList(enquiries));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/enquiries', async (req, res) => {
  try {
    if (!req.body.teacherId) return res.status(400).json({ error: 'teacherId is required' });
    // If ID not provided? Store usually provides ID.
    const enquiry = new Enquiry(req.body);
    await enquiry.save();
    res.json(clean(enquiry));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.patch('/api/enquiries/:id', async (req, res) => {
  try {
    const enquiry = await Enquiry.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    if (!enquiry) return res.status(404).json({ error: 'Not found' });
    res.json(clean(enquiry));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Expenses
app.get('/api/expenses', async (req, res) => {
  try {
    const { teacherId } = req.query;
    const filter = teacherId ? { teacherId } : {};
    const expenses = await Expense.find(filter);
    res.json(cleanList(expenses));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/expenses', async (req, res) => {
  try {
    if (!req.body.teacherId) return res.status(400).json({ error: 'teacherId is required' });
    const expense = new Expense(req.body);
    await expense.save();
    res.json(clean(expense));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Materials
app.get('/api/materials', async (req, res) => {
  try {
    const { teacherId } = req.query;
    const filter = teacherId ? { teacherId } : {};
    const materials = await Material.find(filter);
    res.json(cleanList(materials));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Multer for material upload (Memory storage for Vercel compatibility) ---
const materialUpload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

// Upload material with batch/class selection (accept answerFile, solutionFile, questionFile)
app.post('/api/materials', materialUpload.fields([
  { name: 'answerFile', maxCount: 1 },
  { name: 'solutionFile', maxCount: 1 },
  { name: 'questionFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const { teacherId, title, subject, class: className, batchId, type } = req.body;
    const files = req.files || {};
    console.log('Materials upload received:', { teacherId, title, subject, className, batchId, type, files: Object.keys(files) });

    if (!teacherId) return res.status(400).json({ error: 'teacherId is required' });
    if (!batchId && !className) return res.status(400).json({ error: 'batchId or class is required' });

    let answerUrl = '', solutionUrl = '', questionUrl = '', solutionText = req.body.solutionText || '';

    // Helper to upload a file buffer to Cloudinary
    async function uploadToCloudinary(file, folder) {
      if (!file) return '';
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('File too large. Max 2MB allowed.');
      }
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
          }
        );
        uploadStream.end(file.buffer);
      });
    }

    try {
      if (files.answerFile && files.answerFile[0]) {
        answerUrl = await uploadToCloudinary(files.answerFile[0], 'materials');
      }
      // Prefer solutionFile, fallback to questionFile
      if (files.solutionFile && files.solutionFile[0]) {
        solutionUrl = await uploadToCloudinary(files.solutionFile[0], 'materials');
      } else if (files.questionFile && files.questionFile[0]) {
        solutionUrl = await uploadToCloudinary(files.questionFile[0], 'materials');
        questionUrl = solutionUrl;
      }
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      return res.status(500).json({ error: 'Cloudinary upload failed: ' + err.message });
    }

    // Here you would call Gemini or your AI grading logic, passing answerUrl and solutionUrl (or questionUrl), and solutionText if present
    // Example: await geminiGrade({ answerUrl, solutionUrl, solutionText, ...otherFields })

    // Save material info to DB or return URLs
    res.json({ answerUrl, solutionUrl, questionUrl, solutionText });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete material (from database and Cloudinary)
app.delete('/api/materials/:id', async (req, res) => {
  try {
    const material = await Material.findOneAndDelete({ id: req.params.id });
    if (!material) return res.status(404).json({ error: 'Material not found' });
    
    // Delete from Cloudinary if URL exists
    if (material.url && material.url.includes('cloudinary')) {
      try {
        // Extract public_id from Cloudinary URL
        const urlParts = material.url.split('/');
        const filename = urlParts[urlParts.length - 1].split('.')[0];
        const publicId = `materials/${filename}`;
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error('Failed to delete from Cloudinary:', err);
        // Continue anyway - material deleted from DB
      }
    }
    
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Secure material download endpoint (students must be enrolled)
app.get('/api/materials/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId } = req.query;
    const material = await Material.findOne({ id });
    if (!material) return res.status(404).json({ error: 'Material not found' });
    if (!studentId) return res.status(400).json({ error: 'studentId required' });
    const student = await Student.findOne({ id: studentId });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    // Check if student is in batch/class
    let allowed = false;
    if (material.batchId && student.batchIds.includes(material.batchId)) allowed = true;
    if (material.class && student.class === material.class) allowed = true;
    if (!allowed) return res.status(403).json({ error: 'Access denied' });
    // Send file
    const filePath = path.join(__dirname, '../', material.url);
    res.download(filePath);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Secure marksheet download endpoint (students must be enrolled)
app.get('/api/marksheets/:filename/download', async (req, res) => {
  try {
    const { filename } = req.params;
    const { studentId, examId } = req.query;
    if (!studentId || !examId) return res.status(400).json({ error: 'studentId and examId required' });
    const exam = await Exam.findOne({ id: examId });
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (exam.studentId !== studentId) return res.status(403).json({ error: 'Access denied' });
    // Send file
    const filePath = path.join(__dirname, '../uploads/marksheets', filename);
    res.download(filePath);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Holidays
app.get('/api/holidays', async (req, res) => {
  try {
    const { teacherId } = req.query;
    const filter = teacherId ? { teacherId } : {};
    const holidays = await Holiday.find(filter);
    res.json(cleanList(holidays));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/holidays', async (req, res) => {
  try {
    if (!req.body.teacherId) return res.status(400).json({ error: 'teacherId is required' });
    const holiday = new Holiday(req.body);
    await holiday.save();
    res.json(clean(holiday));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Settings
app.get('/api/settings', async (req, res) => {
  try {
    const { teacherId } = req.query;
    if (!teacherId) return res.status(400).json({ error: 'teacherId is required' });

    let settings = await Settings.findOne({ teacherId });
    if (!settings) {
      settings = new Settings({
        id: `s_${teacherId}`,
        teacherId,
        name: "TutorMate Institute",
        primaryColor: "#3b82f6",
        accentColor: "#10b981",
        academicYear: "2024-2025"
      });
      await settings.save();
    }
    res.json(clean(settings));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.patch('/api/settings', async (req, res) => {
  try {
    const { teacherId } = req.body;
    if (!teacherId) return res.status(400).json({ error: 'teacherId is required' });

    const settings = await Settings.findOneAndUpdate({ teacherId }, req.body, { new: true, upsert: true });
    // Ensure teacherId is preserved/set if upsert happened (though req.body has it)
    res.json(clean(settings));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Automatic Fee Generation Logic ---
const autoGenerateFees = async () => {
  console.log('Running Automatic Fee Generation Check...');
  try {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthIndex = today.getMonth(); // 0-11
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    
    // Target for Advance Policy: Current Month
    const advanceMonthName = monthNames[currentMonthIndex];
    const advanceYear = currentYear;
    
    // Target for Pay-After-Study Policy: Previous Month
    // If today is Jan 2025, previous month is Dec 2024.
    const prevDate = new Date(today);
    prevDate.setDate(1); // Set to 1st to avoid month length issues (e.g. Mar 31 -> Feb 28)
    prevDate.setMonth(prevDate.getMonth() - 1);
    const postpaidYear = prevDate.getFullYear();
    const postpaidMonthIndex = prevDate.getMonth();
    const postpaidMonthName = monthNames[postpaidMonthIndex];

    const students = await Student.find({ isActive: { $ne: false }, archived: { $ne: true }, monthlyFee: { $gt: 0 } });
    let createdCount = 0;

    for (const student of students) {
      // Ensure student has teacherId. If not, we can't assign fee to a teacher.
      if (!student.teacherId) continue;

      const policy = student.feePolicy || 'advance';
      let targetMonth, targetYear, targetMonthIndex, targetDueDate;

      if (policy === 'advance') {
        targetMonth = advanceMonthName;
        targetYear = advanceYear;
        targetMonthIndex = currentMonthIndex;
        // Advance: Fee for Jan is due Jan 10th
        targetDueDate = new Date(targetYear, targetMonthIndex, 10);
      } else {
        // Pay-After-Study: Fee for Dec is due Jan 10th
        targetMonth = postpaidMonthName;
        targetYear = postpaidYear;
        targetMonthIndex = postpaidMonthIndex;
        // Postpaid: Fee for Dec is due Jan 10th (Next month relative to target)
        targetDueDate = new Date(targetYear, targetMonthIndex + 1, 10);
      }

      // Check Join Date Constraints
      const joinDate = student.joinDate ? new Date(student.joinDate) : null;
      if (joinDate) {
         // If student joined AFTER the billing month ended, don't charge.
         // e.g. Joined Jan 5. Target is Dec. Don't charge.
         const billingMonthEnd = new Date(targetYear, targetMonthIndex + 1, 0);
         if (joinDate > billingMonthEnd) {
           continue;
         }
      }

      // Check if fee already exists
      const existing = await Fee.findOne({ 
        teacherId: student.teacherId, // Scope to teacher
        studentId: student.id, 
        month: targetMonth, 
        year: targetYear, 
        type: 'monthly' 
      });

      if (!existing) {
        const fee = new Fee({
            id: `f${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            teacherId: student.teacherId, // Assign to teacher
            studentId: student.id,
            month: targetMonth,
            year: targetYear,
            dueDate: targetDueDate.toISOString().split('T')[0],
            status: 'pending',
            feePolicy: policy,
            isFirstMonth: false,
            createdAt: new Date().toISOString()
        });
        await fee.save();
        createdCount++;
        console.log(`[Auto-Gen] Created ${policy} fee for ${student.name}: ${targetMonth} ${targetYear}`);
      }
    }
    if (createdCount > 0) console.log(`[Auto-Gen] Completed. Generated ${createdCount} new fees.`);
  } catch (e) {
    console.error("[Auto-Gen] Error:", e.message);
  }
};

// --- Auth Routes ---

const getClientIp = (req) => {
    return req.headers['x-forwarded-for'] || req.socket.remoteAddress;
};

// Rate Limiter Middleware
const rateLimiter = (req, res, next) => {
    const ip = getClientIp(req);
    const now = Date.now();
    
    if (ipBlockList.has(ip)) {
        const data = ipBlockList.get(ip);
        if (data.lockUntil && now < data.lockUntil) {
            return res.status(429).json({ 
                error: `Too many failed attempts. Locked. Try again in ${Math.ceil((data.lockUntil - now) / 60000)} minutes.` 
            });
        }
        // If lock expired, reset lock but keep count for exponential backoff
        if (data.lockUntil && now >= data.lockUntil) {
             data.lockUntil = null;
             ipBlockList.set(ip, data);
        }
    }
    next();
};

// --- Teacher Agent Routes ---

app.get('/api/agent/plans', async (req, res) => {
  try {
    const { teacherId } = req.query;
    if (!teacherId) return res.status(400).json({ error: 'Missing teacherId' });
    const plans = await AgentPlan.find({ teacherId });
    res.json(plans.map(clean));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/agent/plans', async (req, res) => {
  try {
    const { id, teacherId, ...data } = req.body;
    let plan = await AgentPlan.findOne({ id });
    if (plan) {
      Object.assign(plan, data);
      plan.lastUpdated = new Date().toISOString();
    } else {
      plan = new AgentPlan({ id, teacherId, ...data, lastUpdated: new Date().toISOString() });
    }
    await plan.save();
    res.json(clean(plan));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/agent/generate', async (req, res) => {
  try {
    const { planId, weekNumber, context } = req.body;
    // context: { classGrade, subject, board, syllabus, ... }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured on server." });
    }

    const { GoogleGenAI } = await import('@google/genai');
    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `
      You are an Autonomous Teacher AI Agent for ${context.classGrade}, Subject: ${context.subject}.
      
      Role: Senior academic teacher and coordinator.
      Task: Plan the teaching for Week ${weekNumber}.
      
      Board: ${context.board}
      Syllabus: ${context.syllabus}
      Start Date: ${context.startDate}
      Exam Date: ${context.examDate || "Not scheduled"}
      Class Schedule: ${context.teachingFrequency || "Daily"} sessions of ${context.sessionDuration || "1 hour"}
      Previous Progress: ${context.previousProgress || "None"}
      
      Generate a JSON response with the following fields:
      - objectives: Clear learning objectives.
      - teachingFlow: Session-wise plan.
      - assignments: Homework and practice.
      - assessmentPlan: Weekly test/quiz details.
      - revisionStrategy: Topics to revise.
      - emailSubject: The subject line for the email.
      - emailBody: The body content of the email.
      - completionPercentage: Estimated % of syllabus completed after this week (Number).
      - riskLevel: 'Low', 'Medium', or 'High'.
      - riskAnalysis: Brief explanation of the risk or pacing status.
      
      Follow these rules for the Email:
      Subject: Weekly Teaching Plan – Week ${weekNumber} – ${context.subject}, Class ${context.classGrade}
      Body: Greeting, Weekly objective, Syllabus to be covered, Teaching flow, Assignment details, Test/Revision plan, Special notes (include risk analysis if high), Professional closing.
      
      Output ONLY valid JSON.
    `;

    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    
    const responseText = response.text();
    // Clean markdown code blocks if present
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const generatedData = JSON.parse(cleanJson);

    // Calculate week dates
    const start = new Date(context.startDate);
    start.setDate(start.getDate() + (weekNumber - 1) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];

    // Update the plan in DB
    const plan = await AgentPlan.findOne({ id: planId });
    if (plan) {
      // Update High Level Metrics
      plan.currentSyllabusCompletion = generatedData.completionPercentage || plan.currentSyllabusCompletion;
      plan.currentRiskLevel = generatedData.riskLevel || 'Low';

      const weekIndex = plan.weeklyPlans.findIndex(w => w.weekNumber === weekNumber);
      
      // Construct combined content for storage/display
      const emailContent = `Subject: ${generatedData.emailSubject}\n\n${generatedData.emailBody}`;
      
      const newWeek = {
        weekNumber,
        startDate: startDateStr,
        endDate: endDateStr,
        ...generatedData,
        emailContent, // Store combined for frontend display
        status: 'completed',
        generatedAt: new Date().toISOString()
      };
      
      if (weekIndex >= 0) {
        plan.weeklyPlans[weekIndex] = newWeek;
      } else {
        plan.weeklyPlans.push(newWeek);
      }
      await plan.save();

      // --- AUTOMATIC EMAIL TRIGGER ---
      try {
        const teacher = await AuthUser.findOne({ id: plan.teacherId });
        if (teacher && teacher.email) {
            console.log(`[Agent] Sending automatic plan to ${teacher.email}`);
            await sendEmail(teacher.email, generatedData.emailSubject, generatedData.emailBody);
        } else {
            console.warn('[Agent] Teacher email not found, skipping auto-email.');
        }
      } catch (emailErr) {
          console.error("[Agent] Failed to send email:", emailErr);
      }
    }

    res.json(generatedData);

  } catch (e) {
    console.error("Agent Generation Error:", e);
    // If we can't generate, return a stub so it doesn't crash the UI
    if (e.message.includes("GEMINI_API_KEY")) {
        res.status(500).json({ error: e.message });
    } else {
        res.status(500).json({ error: "AI Generation Failed: " + e.message });
    }
  }
});

// --- Cron Job for Weekly Automation ---
app.post('/api/cron/run-weekly-planner', async (req, res) => {
  const CRON_SECRET = process.env.CRON_SECRET || 'make_sure_this_is_secure';
  if (req.headers['x-cron-secret'] !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Cron Secret' });
  }

  console.log('[Cron] Starting Weekly Planner...');
  
  try {
    // 1. Find all active plans
    const activePlans = await AgentPlan.find({ status: 'active' });
    console.log(`[Cron] Found ${activePlans.length} active plans.`);
    
    if (activePlans.length === 0) {
      return res.json({ message: 'No active plans found', generatedCount: 0 });
    }

    const { GoogleGenAI } = await import('@google/genai');
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");
    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const results = [];

    // 2. Iterate and Generate
    for (const plan of activePlans) {
      try {
        const nextWeekNum = (plan.weeklyPlans.length || 0) + 1;
        console.log(`[Cron] Generating Week ${nextWeekNum} for Plan ${plan.id} (${plan.subject})`);

        // Construct Context
        const context = {
            classGrade: plan.classGrade,
            subject: plan.subject,
            board: plan.board,
            syllabus: plan.syllabus,
            startDate: plan.startDate,
            examDate: plan.examDate,
            teachingFrequency: plan.teachingFrequency,
            sessionDuration: plan.sessionDuration,
            previousProgress: plan.weeklyPlans.map(w => `Week ${w.weekNumber}: ${w.objectives}`).join('; ')
        };

        // Reuse Prompt Logic (Simplified version of the manual one)
        const prompt = `
          You are an Autonomous Teacher AI Agent for ${context.classGrade}, Subject: ${context.subject}.
          Task: Plan the teaching for Week ${nextWeekNum}.
          Board: ${context.board}
          Syllabus: ${context.syllabus}
          Start Date: ${context.startDate}
          Exam Date: ${context.examDate || "Not scheduled"}
          Class Schedule: ${context.teachingFrequency || "Daily"} sessions of ${context.sessionDuration || "1 hour"}
          Previous Progress: ${context.previousProgress || "None"}
          
          Generate a JSON response with:
          - objectives, teachingFlow, assignments, assessmentPlan, revisionStrategy
          - emailSubject, emailBody
          - completionPercentage (number), riskLevel (Low/Medium/High), riskAnalysis
          
          Email Rules: Professional, addressed to teacher, clear weekly targets.
          Output ONLY JSON.
        `;

        const response = await client.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
        });

        const responseText = response.text();
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const generatedData = JSON.parse(cleanJson);

        // Dates
        const start = new Date(context.startDate);
        start.setDate(start.getDate() + (nextWeekNum - 1) * 7);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);

        // Save
        const newWeek = {
            weekNumber: nextWeekNum,
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            ...generatedData,
            emailContent: `Subject: ${generatedData.emailSubject}\n\n${generatedData.emailBody}`,
            status: 'completed',
            generatedAt: new Date().toISOString()
        };

        plan.weeklyPlans.push(newWeek);
        plan.currentSyllabusCompletion = generatedData.completionPercentage || plan.currentSyllabusCompletion;
        plan.currentRiskLevel = generatedData.riskLevel || 'Low';
        await plan.save();

        // Send Email
        const teacher = await AuthUser.findOne({ id: plan.teacherId });
        if (teacher && teacher.email) {
            await sendEmail(teacher.email, generatedData.emailSubject, generatedData.emailBody);
            results.push({ planId: plan.id, status: 'sent', email: teacher.email });
        } else {
            results.push({ planId: plan.id, status: 'saved_no_email' });
        }

      } catch (innerErr) {
        console.error(`[Cron] Error processing plan ${plan.id}:`, innerErr.message);
        results.push({ planId: plan.id, error: innerErr.message });
      }
    }

    res.json({ success: true, results });

  } catch (e) {
    console.error("[Cron] Global Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// --- Authentication ---
app.post('/api/auth/login', rateLimiter, async (req, res) => {
    const { email, password, role } = req.body; // Added role
    const ip = getClientIp(req);

    try {
        let user;
        let isStudent = false;

        // Determine who is logging in
        if (role === 'student') {
            user = await Student.findOne({ email });
            isStudent = true;
        } else {
            user = await AuthUser.findOne({ email });
        }
        
        // Handle failure (Simulated delay to prevent timing attacks)
        const handleFail = async () => {
            let data = ipBlockList.get(ip) || { count: 0, lockUntil: null };
            data.count += 1;
            
            // Rules:
            // > 3 attempts: Mail (Only for Admin/Teacher accounts usually, but strictly safe for all)
            // > 5 attempts: Lockout
            
            if (data.count > 3 && !isStudent) {
                // Send Alert only for Admin attempts to avoid spam from student bruteforce
                const subject = `Security Alert: Failed Login Attempts for ${email || 'Unknown User'}`;
                const text = `Multiple failed login attempts detected from IP: ${ip}.\nTime: ${new Date().toLocaleString()}`;
                const adminEmail = process.env.ADMIN_EMAIL || 'admin@tutormate.com';
                await sendEmail(adminEmail, subject, text);
            }

            if (data.count > 5) {
                // Exponential backoff
                const baseLock = 60 * 60 * 1000; // 1 hour
                const factor = Math.pow(2, data.count - 6); 
                data.lockUntil = Date.now() + (baseLock * factor);
                console.log(`[Security] IP ${ip} locked until ${new Date(data.lockUntil).toISOString()}`);
            }

            ipBlockList.set(ip, data);
            return res.status(401).json({ error: "Invalid credentials" });
        };

        if (!user) return await handleFail();
        if (!user.passwordHash) return await handleFail(); // Should have password

        // Check for Frozen Account
        if (!isStudent && user.isFrozen) {
            console.log(`[Security] Login blocked for frozen account: ${email}`);
            return res.status(403).json({ error: "Your account has been suspended. Please contact the administrator." });
        }

        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) return await handleFail();

        // Success
        ipBlockList.delete(ip);
        // Don't send hash
        const safeUser = clean(user);
        
        // Normalize role for frontend
        if (isStudent) {
            safeUser.role = 'student';
            safeUser.studentId = user.id; // Map Internal ID
        }

        res.json(safeUser);

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/setup', async (req, res) => {
    try {
        const count = await AuthUser.countDocuments();
        if (count > 0) return res.status(400).json({ error: "Setup already completed" });

        const { email, password, name } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Email and password required" });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const admin = new AuthUser({
            id: `u${Date.now()}`,
            email,
            passwordHash: hash,
            role: 'superadmin',
            name: name || 'Super Admin'
        });

        await admin.save();
        res.json({ message: "Super Admin created successfully" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await AuthUser.findOne({ email });
        if (!user) {
             // Fake success to prevent enumeration
             return res.json({ message: "If the email exists, a reset link has been sent." });
        }

        // Generate Token
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        user.resetToken = token;
        user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
        await user.save();

        // Use frontend URL from environment variable, fallback to localhost
        // Use frontend URL from environment variable, fallback to production Vercel URL, then localhost
        const FRONTEND_URL = process.env.FRONTEND_URL || 'https://app.mondalsirmaths.in' || 'http://localhost:3000';
        const resetLink = `${FRONTEND_URL}/?resetToken=${token}`;

        const subject = "Reset Your Password - TutorMate";
        const text = `You requested a password reset.\n\nClick the link below to verify your identity and set a new password:\n\n${resetLink}\n\n(Link expires in 1 hour)\n\nIf you did not request this, please ignore this email.`;

        await sendEmail(email, subject, text);

        res.json({ message: "If the email exists, a reset link has been sent." });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const user = await AuthUser.findOne({ 
            resetToken: token, 
            resetTokenExpiry: { $gt: Date.now() } 
        });

        if (!user) return res.status(400).json({ error: "Invalid or expired token" });

        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();

        res.json({ message: "Password updated successfully" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Server startup is handled by startServer() above
// const PORT = process.env.PORT || 4000;
// app.listen(PORT, () => { ... });

// Endpoint for direct marksheet upload (used by frontend before result submission)
app.post('/api/upload/marksheet', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = `/uploads/marksheets/${req.file.filename}`;
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import fetch from 'node-fetch';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

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

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
      'ionic://localhost'
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

const authUserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['teacher', 'superadmin'], default: 'teacher' },
  name: String,
  resetToken: String,
  resetTokenExpiry: Date,
  isFrozen: { type: Boolean, default: false }
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
    const teachersRaw = await AuthUser.find({ role: 'teacher' });
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
      teachers
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
// --- Multer for file upload ---
import multer from 'multer';
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/marksheets'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Ensure upload dir exists
import fs from 'fs';
const uploadDir = path.join(__dirname, '../uploads/marksheets');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

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
      marksheetUrl = `/uploads/marksheets/${req.file.filename}`;
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

// --- Multer for material upload ---
// Reuse the already imported multer above. Only define new storage and upload instance.
const materialStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/materials'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const materialUpload = multer({ storage: materialStorage });

// Ensure upload dir exists
const materialUploadDir = path.join(__dirname, '../uploads/materials');
if (!fs.existsSync(materialUploadDir)) fs.mkdirSync(materialUploadDir, { recursive: true });

// Upload material with batch/class selection
app.post('/api/materials', materialUpload.single('file'), async (req, res) => {
  try {
    const { teacherId, title, subject, class: className, batchId, type } = req.body;
    if (!teacherId) return res.status(400).json({ error: 'teacherId is required' });
    if (!batchId && !className) return res.status(400).json({ error: 'batchId or class is required' });

    let url = '';
    if (req.file) {
      url = `/uploads/materials/${req.file.filename}`;
    }

    const material = new Material({
      id: `mat_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
      teacherId,
      title,
      subject,
      class: className,
      batchId,
      type,
      url,
      uploadDate: new Date().toISOString()
    });
    await material.save();

    // Find students in batch
    let students = [];
    if (batchId) {
      students = await Student.find({ batchIds: batchId, teacherId });
    } else if (className) {
      students = await Student.find({ class: className, teacherId });
    }

    // Send email to all students in batch/class
    for (const student of students) {
      let emailText = `Dear ${student.name},\n\nNew study material has been uploaded: ${title}`;
      if (subject) emailText += `\nSubject: ${subject}`;
      if (url) emailText += `\nYou can download/view it here: ${url}`;
      emailText += '\n\nRegards,\nTutorMate';
      await sendEmail(student.email, `New Material Uploaded: ${title}`, emailText);
    }

    res.json(clean(material));
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

        const resetLink = `http://${req.get('host').replace(/:\d+$/, ':3000')}/?resetToken=${token}`;
        
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

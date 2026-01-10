import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFile = path.join(__dirname, 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { batches: [], students: [], attendance: [], fees: [], payments: [], exams: [], messages: [], notices: [] });

async function main() {
  await db.read();
  db.data = { batches: [], students: [], attendance: [], fees: [], payments: [], exams: [], messages: [], notices: [] };
  db.data.batches.push({ id: 'b1', name: 'Class 10 - Physics', subject: 'Physics', schedule: 'Mon, Wed 5:00 PM', color: 'bg-blue-100 text-blue-800 border-blue-200', slots: [{ id: 'bs1', day: 'Mon', time: '17:00', duration: 60 }, { id: 'bs2', day: 'Wed', time: '17:00', duration: 60 }] });
  db.data.batches.push({ id: 'b2', name: 'Class 12 - Math', subject: 'Mathematics', schedule: 'Tue, Thu 6:00 PM', color: 'bg-green-100 text-green-800 border-green-200', slots: [{ id: 'bs3', day: 'Tue', time: '18:00', duration: 60 }, { id: 'bs4', day: 'Thu', time: '18:00', duration: 60 }] });
  db.data.batches.push({ id: 'b3', name: 'Class 9 - Science', subject: 'Science', schedule: 'Sat 10:00 AM', color: 'bg-purple-100 text-purple-800 border-purple-200', slots: [{ id: 'bs5', day: 'Sat', time: '10:00', duration: 90 }] });

  // Students
  db.data.students.push({ id: 's1', name: 'Aarav Patel', grade: '10', school: 'DPS', parentName: 'Suresh Patel', contact: '9876543210', batchId: 'b1', joinedDate: '2023-01-15', status: 'active' });
  db.data.students.push({ id: 's2', name: 'Vivaan Gupta', grade: '12', school: 'Modern School', parentName: 'Rajiv Gupta', contact: '9876543211', batchId: 'b2', joinedDate: '2023-02-10', status: 'active' });
  db.data.students.push({ id: 's3', name: 'Diya Sharma', grade: '10', school: 'KV', parentName: 'Anita Sharma', contact: '9876543212', batchId: 'b1', joinedDate: '2023-03-05', status: 'active' });
  db.data.students.push({ id: 's4', name: 'Aditya Singh', grade: '9', school: 'St. Xaviers', parentName: 'Vikram Singh', contact: '9876543213', batchId: 'b3', joinedDate: '2023-04-20', status: 'active' });
  db.data.students.push({ id: 's5', name: 'Ananya Roy', grade: '12', school: 'DPS', parentName: 'Sunil Roy', contact: '9876543214', batchId: 'b2', joinedDate: '2023-01-20', status: 'active' });

  // Fees
  db.data.fees.push({ id: 'f1', studentId: 's1', amount: 2000, dueDate: '2023-11-05', status: 'paid', type: 'monthly', month: 'November', paidOn: '2023-11-04' });
  db.data.fees.push({ id: 'f2', studentId: 's2', amount: 2500, dueDate: '2023-11-05', status: 'overdue', type: 'monthly', month: 'November' });
  db.data.fees.push({ id: 'f3', studentId: 's3', amount: 2000, dueDate: '2023-11-05', status: 'pending', type: 'monthly', month: 'November' });
  db.data.fees.push({ id: 'f4', studentId: 's4', amount: 1800, dueDate: '2023-11-05', status: 'paid', type: 'monthly', month: 'November', paidOn: '2023-11-03' });
  db.data.fees.push({ id: 'f5', studentId: 's5', amount: 2500, dueDate: '2023-11-05', status: 'pending', type: 'monthly', month: 'November' });
  db.data.payments.push({ id: 'p1', feeId: 'f1', date: '2023-11-04', amount: 2000, method: 'upi' });
  db.data.payments.push({ id: 'p3', feeId: 'f4', date: '2023-11-03', amount: 1800, method: 'bank' });
  db.data.payments.push({ id: 'p2', feeId: 'f2', date: '2023-11-10', amount: 1000, method: 'cash', note: 'Partial' });

  // Attendance
  db.data.attendance.push({ id: 'a1', batchId: 'b1', date: '2023-10-30', presentStudentIds: ['s1', 's3'] });
  db.data.attendance.push({ id: 'a2', batchId: 'b2', date: '2023-10-31', presentStudentIds: ['s2', 's5'] });

  // Exams
  db.data.exams.push({ id: 'e1', studentId: 's1', examName: 'Mid-Term', date: '2023-09-15', marksObtained: 85, totalMarks: 100, subject: 'Physics' });
  db.data.exams.push({ id: 'e2', studentId: 's1', examName: 'Unit Test 1', date: '2023-10-10', marksObtained: 18, totalMarks: 20, subject: 'Physics' });
  db.data.exams.push({ id: 'e3', studentId: 's3', examName: 'Mid-Term', date: '2023-09-15', marksObtained: 72, totalMarks: 100, subject: 'Physics' });
  db.data.exams.push({ id: 'e4', studentId: 's3', examName: 'Unit Test 1', date: '2023-10-10', marksObtained: 15, totalMarks: 20, subject: 'Physics' });
  db.data.exams.push({ id: 'e5', studentId: 's2', examName: 'Mid-Term', date: '2023-09-20', marksObtained: 92, totalMarks: 100, subject: 'Math' });
  db.data.exams.push({ id: 'e6', studentId: 's5', examName: 'Mid-Term', date: '2023-09-20', marksObtained: 88, totalMarks: 100, subject: 'Math' });

  // Messages
  db.data.messages.push({ id: 'm1', batchId: 'b1', senderId: 'teacher', senderName: 'Tutor', text: 'Welcome to Physics Class 10! Please bring your notes tomorrow.', timestamp: new Date(Date.now() - 86400000).toISOString(), role: 'teacher' });
  db.data.messages.push({ id: 'm2', batchId: 'b1', senderId: 's1', senderName: 'Aarav Patel', text: 'Sir, which chapter?', timestamp: new Date(Date.now() - 86000000).toISOString(), role: 'student' });

  // Notices
  db.data.notices.push({ id: 'n1', title: 'Diwali Holidays', content: 'The center will remain closed from Nov 1st to Nov 5th for Diwali celebrations. Happy Diwali!', date: '2023-10-25', batchId: 'b1' });
  db.data.notices.push({ id: 'n2', title: 'Physics Test Postponed', content: 'The Unit Test scheduled for Monday is moved to Wednesday due to heavy rains.', date: '2023-10-28', batchId: 'b1' });

  await db.write();
}

main().then(() => console.log('Seed complete')).catch(e => console.error(e));

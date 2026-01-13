
import { Parser } from 'json2csv';
import mongoose from 'mongoose';
import { Attendance } from './index.js';
const Student = mongoose.models.Student || mongoose.model('Student');
const Batch = mongoose.models.Batch || mongoose.model('Batch');

export async function generateAttendanceCSV({ studentId, batchId, from, to }) {
  const filter = {};
  if (studentId) filter['records.studentId'] = studentId;
  if (batchId) filter['batchId'] = batchId;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }
  const records = await Attendance.find(filter);
  const rows = [];
  for (const rec of records) {
    // Get batch info once per record
    let batchName = '';
    let batchClass = '';
    if (rec.batchId) {
      const batch = await Batch.findOne({ id: rec.batchId });
      batchName = batch?.name || '';
      batchClass = batch?.subject || '';
    }
    for (const entry of rec.records) {
      if (!studentId || entry.studentId === studentId) {
        // Get student info
        let studentName = '';
        let studentClass = '';
        if (entry.studentId) {
          const student = await Student.findOne({ id: entry.studentId });
          studentName = student?.name || '';
          studentClass = student?.class || '';
        }
        rows.push({
          date: rec.date,
          batchId: rec.batchId,
          batchName,
          studentId: entry.studentId,
          studentName,
          class: studentClass,
          status: entry.status,
          timestamp: entry.timestamp || rec.timestamp || ''
        });
      }
    }
  }
  const parser = new Parser({ fields: ['date', 'batchId', 'batchName', 'studentId', 'studentName', 'class', 'status', 'timestamp'] });
  return parser.parse(rows);
}

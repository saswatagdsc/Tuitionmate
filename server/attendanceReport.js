import { Parser } from 'json2csv';
import mongoose from 'mongoose';
import { Attendance } from './index.js';

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
  // Flatten records for CSV
  const rows = [];
  for (const rec of records) {
    for (const entry of rec.records) {
      if (!studentId || entry.studentId === studentId) {
        rows.push({
          date: rec.date,
          batchId: rec.batchId,
          studentId: entry.studentId,
          status: entry.status
        });
      }
    }
  }
  const parser = new Parser({ fields: ['date', 'batchId', 'studentId', 'status'] });
  return parser.parse(rows);
}

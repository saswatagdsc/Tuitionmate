import React from 'react';
import { useData } from '../services/store';
import { CalendarCheck, IndianRupee, GraduationCap, Clock } from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { currentUser, students, batches, attendance, fees, exams } = useData();
  
  if (!currentUser || !currentUser.studentId) return null;

  const student = students.find(s => s.id === currentUser.studentId);
  const studentBatchId = student?.batchIds?.[0] || currentUser.batchId;
  const batch = batches.find(b => b.id === studentBatchId);

  if (!student) return <div className="p-8 text-center text-slate-500">Student data not found.</div>;

  // Stats - Calculate attendance from records array
  const batchAttendance = attendance.filter(a => a.batchId === studentBatchId);
  const totalClasses = batchAttendance.length;
  const presentCount = batchAttendance.filter(a => {
    const record = a.records?.find(r => r.studentId === student.id);
    return record?.status === 'present' || record?.status === 'late';
  }).length;
  const attendancePercent = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;

  const myPendingFees = fees
    .filter(f => f.studentId === student.id && (f.status === 'pending' || f.status === 'overdue'))
    .reduce((sum, f) => sum + f.amount, 0);

  const myRecentExam = exams
    .filter(e => e.studentId === student.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Hello, {student.name}</h2>
        <p className="text-slate-500">Welcome to your student portal.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Attendance Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <CalendarCheck size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Attendance</p>
              <h3 className="text-2xl font-bold text-slate-900">{attendancePercent}%</h3>
              <p className="text-xs text-slate-400">{presentCount}/{totalClasses} classes</p>
            </div>
        </div>

        {/* Fee Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-red-50 text-red-600 rounded-lg">
              <IndianRupee size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Pending Fees</p>
              <h3 className={`text-2xl font-bold ${myPendingFees > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ₹{myPendingFees.toLocaleString()}
              </h3>
              <p className="text-xs text-slate-400">{myPendingFees > 0 ? 'Action Required' : 'All Clear'}</p>
            </div>
        </div>

        {/* Academics Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <GraduationCap size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Recent Result</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {myRecentExam ? `${Math.round((myRecentExam.marks / myRecentExam.totalMarks) * 100)}%` : '-'}
              </h3>
              <p className="text-xs text-slate-400">{myRecentExam ? myRecentExam.examName : 'No exams yet'}</p>
            </div>
        </div>
      </div>

      {/* Batch Info */}
      <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
         <div className="relative z-10">
            <h3 className="text-lg font-bold mb-2">My Batch</h3>
            <p className="text-blue-200 mb-4">{batch?.name || 'Unassigned'}</p>
            <div className="flex items-center gap-2 text-sm text-slate-300">
               <Clock size={16} />
               <span>{batch ? `${batch.days?.join(', ')} at ${batch.time}` : 'No schedule'}</span>
            </div>
         </div>
         <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
            <GraduationCap size={200} />
         </div>
      </div>
    </div>
  );
};
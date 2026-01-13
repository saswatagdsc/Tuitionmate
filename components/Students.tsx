import React, { useState } from 'react';
import { useData } from '../services/store';
import { Plus, Search, Phone, ArrowLeft, User, GraduationCap, IndianRupee, CalendarCheck, MessageCircle, X, Trash2, Archive, ArchiveRestore, Pencil, CheckSquare, Square } from 'lucide-react';
import { Student, FeeRecord, AttendanceRecord, Batch } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// --- Attendance Calendar Component ---
const AttendanceCalendar: React.FC<{ 
  studentId: string; 
  batchId: string; 
  attendance: AttendanceRecord[];
  batchData?: Batch;
}> = ({ studentId, batchId, attendance, batchData }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get all attendance records for this student
  const studentAttendance = attendance.map(record => {
    const studentRecord = (record as any).records?.find((r: any) => r.studentId === studentId);
    return {
      date: record.date,
      status: studentRecord?.status || 'absent'
    };
  });

  // Count frequencies
  const totalClasses = studentAttendance.length;
  const presentCount = studentAttendance.filter(a => a.status === 'present').length;
  const absentCount = studentAttendance.filter(a => a.status === 'absent').length;
  const lateCount = studentAttendance.filter(a => a.status === 'late').length;
  
  // Check if attending more than prescribed
  const prescribedDays = batchData?.days || [];
  const monthlyExpectedClasses = Math.ceil((totalClasses / 30) * prescribedDays.length);
  const overAttending = presentCount > monthlyExpectedClasses && totalClasses > 0;

  // Get dates from this month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const getAttendanceForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return studentAttendance.find(a => a.date === dateStr);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'absent':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'late':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return 'bg-slate-50 text-slate-400 border-slate-200';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'present':
        return '✓';
      case 'absent':
        return '✕';
      case 'late':
        return '⧖';
      default:
        return '-';
    }
  };

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          className="px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          ← Prev
        </button>
        <h4 className="font-bold text-slate-900">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h4>
        <button
          onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          className="px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          Next →
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="space-y-2">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-xs font-bold text-slate-500 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            const attendance = day ? getAttendanceForDate(day) : undefined;
            return (
              <div
                key={idx}
                className={`aspect-square flex items-center justify-center rounded-lg border text-xs font-bold transition-colors ${
                  day ? getStatusColor(attendance?.status) : 'bg-slate-50 border-slate-100'
                }`}
              >
                {day ? (
                  <div className="flex flex-col items-center">
                    <span className="text-xs">{day}</span>
                    <span className="text-[10px]">{getStatusLabel(attendance?.status)}</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100">
        <div className="text-center">
          <div className="text-lg font-bold text-slate-900">{presentCount}</div>
          <div className="text-[10px] text-green-600 uppercase font-bold">Present</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-slate-900">{absentCount}</div>
          <div className="text-[10px] text-red-600 uppercase font-bold">Absent</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-slate-900">{lateCount}</div>
          <div className="text-[10px] text-yellow-600 uppercase font-bold">Late</div>
        </div>
        {overAttending && (
          <div className="text-center bg-orange-50 rounded-lg p-1">
            <div className="text-xs font-bold text-orange-600">⚠</div>
            <div className="text-[10px] text-orange-600 uppercase font-bold">Over Freq</div>
          </div>
        )}
      </div>

      {/* Over-Attendance Warning */}
      {overAttending && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-700 font-medium">
            ⚠️ This student is attending more than the prescribed frequency for this batch ({prescribedDays.length} days/week).
          </p>
        </div>
      )}
    </div>
  );
};

// --- Student Detail Sub-Component ---
const StudentDetailView: React.FC<{ studentId: string; onClose: () => void }> = ({ studentId, onClose }) => {
  const { students, batches, attendance, fees, exams, deleteStudent, archiveStudent, updateStudent } = useData();
  const student = students.find(s => s.id === studentId);
  const studentBatchId = student?.batchIds?.[0] || (student as any).batchId;
  const batch = batches.find(b => b.id === studentBatchId);

  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState({
    name: student?.name || '',
    class: student?.class || '',
    rollNo: student?.rollNo || '',
    parentName: student?.parentName || '',
    phone: student?.phone || ''
  });

  if (!student) return null;

  const startEdit = () => {
    setEditDraft({
      name: student.name,
      class: student.class,
      rollNo: student.rollNo,
      parentName: student.parentName,
      phone: student.phone
    });
    setIsEditing(true);
  };

  const saveEdit = async () => {
    if (!updateStudent) return;
    const digits = (editDraft.phone || '').replace(/\D/g, '');
    if (digits.length !== 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }
    await updateStudent(student.id, {
      name: editDraft.name,
      class: editDraft.class,
      rollNo: editDraft.rollNo,
      parentName: editDraft.parentName,
      phone: digits
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to permanently delete ${student.name}? This action cannot be undone.`)) {
      deleteStudent(student.id);
      onClose();
    }
  };

  const handleArchive = () => {
    const action = student.archived ? 'restore' : 'archive';
    if (window.confirm(`Are you sure you want to ${action} ${student.name}?`)) {
      archiveStudent(student.id, !student.archived);
      onClose();
    }
  };

  // 1. Calculate Attendance Stats
  const batchAttendanceRecords = attendance.filter(a => a.batchId === studentBatchId);
  const totalClasses = batchAttendanceRecords.length;
  const attendedClasses = batchAttendanceRecords.filter(a => {
     if ((a as any).records) {
         return (a as any).records.find((r: any) => r.studentId === student.id && r.status === 'present');
     }
     return (a as any).presentStudentIds?.includes(student.id);
  }).length;
  const attendancePercentage = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0;

  // 2. Calculate Fee Stats
  const studentFees = fees.filter(f => f.studentId === student.id);
  const pendingAmount = studentFees
    .filter(f => f.status === 'pending' || f.status === 'overdue')
    .reduce((sum, f) => sum + f.amount, 0);

  // 3. Calculate Academic Stats
  const studentExams = exams.filter(e => e.studentId === student.id);
  const examData = studentExams.map(e => ({
    name: e.examName,
    score: Math.round((e.marks / e.totalMarks) * 100)
  }));

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-slate-200 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onClose} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-lg font-bold text-slate-900">Student Profile</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Profile Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center relative">
          <div className="absolute top-4 right-4 flex gap-2">
            {!student.archived && (
              <button
                onClick={isEditing ? saveEdit : startEdit}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title={isEditing ? 'Save changes' : 'Edit details'}
              >
                <Pencil size={18} />
              </button>
            )}
            <button onClick={handleArchive} className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-colors" title={student.archived ? "Restore" : "Archive"}>
              {student.archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
            </button>
            <button onClick={handleDelete} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Delete">
              <Trash2 size={18} />
            </button>
          </div>
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-3">
            {student.name.charAt(0)}
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center justify-center gap-2">
            {isEditing ? (
              <input
                className="px-2 py-1 rounded-lg border border-slate-200 text-center text-base font-semibold"
                value={editDraft.name}
                onChange={e => setEditDraft({ ...editDraft, name: e.target.value })}
              />
            ) : (
              student.name
            )}
            {student.archived && <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">Archived</span>}
          </h1>
          <p className="text-slate-500 text-sm mb-4">
            {isEditing ? (
              <span className="flex items-center justify-center gap-2">
                <input
                  className="w-24 px-2 py-1 rounded-lg border border-slate-200 text-center text-xs"
                  placeholder="Class"
                  value={editDraft.class}
                  onChange={e => setEditDraft({ ...editDraft, class: e.target.value })}
                />
                <span>•</span>
                <input
                  className="w-24 px-2 py-1 rounded-lg border border-slate-200 text-center text-xs"
                  placeholder="Roll"
                  value={editDraft.rollNo}
                  onChange={e => setEditDraft({ ...editDraft, rollNo: e.target.value })}
                />
              </span>
            ) : (
              <>{student.class} • Roll {student.rollNo}</>
            )}
          </p>
          
          <div className="flex justify-center gap-3">
            <a href={`tel:${student.phone}`} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors">
              <Phone size={16} /> Call Parent
            </a>
            {(() => {
              const digits = (student.phone || '').replace(/\D/g, '');
              const local10 = digits.startsWith('0') ? digits.slice(1) : digits;
              const finalNumber = local10.length === 10 ? `91${local10}` : digits;
              return (
                <a
                  href={finalNumber ? `https://wa.me/${finalNumber}` : undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={e => { if (!finalNumber) e.preventDefault(); }}
                >
                  <MessageCircle size={16} /> WhatsApp
                </a>
              );
            })()}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
            <div className="text-purple-500 mb-1 flex justify-center"><CalendarCheck size={20} /></div>
            <div className="text-lg font-bold text-slate-900">{attendancePercentage}%</div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Attendance</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
             <div className="text-red-500 mb-1 flex justify-center"><IndianRupee size={20} /></div>
            <div className={`text-lg font-bold ${pendingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₹{pendingAmount}
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Due Fees</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-center">
             <div className="text-blue-500 mb-1 flex justify-center"><GraduationCap size={20} /></div>
            <div className="text-lg font-bold text-slate-900">{batch?.subject || '-'}</div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Subject</div>
          </div>
        </div>

        {/* Attendance Calendar */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">Attendance Calendar</h3>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <AttendanceCalendar 
              studentId={student.id}
              batchId={studentBatchId}
              attendance={batchAttendanceRecords}
              batchData={batch}
            />
          </div>
        </div>

        {/* Fee History */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">Fee History</h3>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
            {studentFees.length > 0 ? studentFees.map(fee => (
              <div key={fee.id} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-slate-900 text-sm">{fee.title}</p>
                  <p className="text-xs text-slate-500">Due: {new Date(fee.dueDate).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-slate-900">₹{fee.amount}</span>
                  <span className={`text-[10px] uppercase font-bold ${fee.status === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
                    {fee.status}
                  </span>
                </div>
              </div>
            )) : (
              <div className="p-4 text-center text-slate-400 text-sm">No fee records found.</div>
            )}
          </div>
        </div>

        {/* Performance Chart */}
        {examData.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">Performance Trend</h3>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={examData}>
                  <XAxis dataKey="name" hide />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={3} dot={{r: 4, fill: '#2563eb'}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Basic Info */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">Details</h3>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-500 text-sm">Parent Name</span>
              {isEditing ? (
                <input
                  className="text-right text-sm px-2 py-1 rounded-lg border border-slate-200"
                  value={editDraft.parentName}
                  onChange={e => setEditDraft({ ...editDraft, parentName: e.target.value })}
                />
              ) : (
                <span className="text-slate-900 font-medium text-sm">{student.parentName}</span>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-sm">Batch</span>
              <span className="text-slate-900 font-medium text-sm">{batch?.name || 'Individual (No batch)'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-sm">Phone</span>
              {isEditing ? (
                <input
                  className="text-right text-sm px-2 py-1 rounded-lg border border-slate-200"
                  value={editDraft.phone}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '');
                    if (digits.length <= 10) {
                      setEditDraft({ ...editDraft, phone: digits });
                    }
                  }}
                  maxLength={10}
                  placeholder="10-digit mobile"
                />
              ) : (
                <span className="text-slate-900 font-medium text-sm">{student.phone}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// --- Main Students Component ---
export const Students: React.FC = () => {
  const { students, batches, addStudent, addFee, deleteStudent } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const generateNextRollNo = () => {
    const numericRolls = students
      .map(s => parseInt(s.rollNo || '', 10))
      .filter(n => !isNaN(n));
    const next = numericRolls.length ? Math.max(...numericRolls) + 1 : 1;
    return String(next);
  };

  // Use local state for form logic, ensuring keys match Student interface if possible or map them
  const [newStudent, setNewStudent] = useState({
    name: '',
    parentName: '',
    mobile: '',
    class: '',
    rollNo: '',
    batchId: batches[0]?.id || '',
    isIndividual: false,
    // Fee configuration
    monthlyFee: '',
    feePolicy: 'advance' as 'advance' | 'pay-after-study'
  });

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!window.confirm(`Are you sure you want to permanently delete ${count} student${count > 1 ? 's' : ''}? This action cannot be undone.`)) {
      return;
    }
    for (const id of selectedIds) {
      await deleteStudent(id);
    }
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArchive = showArchived ? s.archived : !s.archived;
    return matchesSearch && matchesArchive;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name) return;
    const mobileDigits = newStudent.mobile.replace(/\D/g, '');
    if (mobileDigits.length !== 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }
    // For batch-mode students, batch is required; for individual students, no batch is needed
    if (!newStudent.isIndividual && !newStudent.batchId) return;

    const studentId = `s${Date.now()}`;
    const joinDate = new Date().toISOString().split('T')[0];

    await addStudent({
      id: studentId,
      name: newStudent.name,
      parentName: newStudent.parentName || '',
      phone: mobileDigits,
      email: newStudent.email, // Add email
      class: newStudent.class || '',
      rollNo: newStudent.rollNo || generateNextRollNo(),
      batchIds: newStudent.isIndividual ? [] : [newStudent.batchId],
      // Fee configuration
      monthlyFee: newStudent.monthlyFee ? Number(newStudent.monthlyFee) : undefined,
      feePolicy: newStudent.feePolicy,
      joinDate,
      isActive: true
    }); 

    // Create initial fee for the new student (goes to Fees section as pending)
    if (newStudent.monthlyFee && Number(newStudent.monthlyFee) > 0) {
      const amount = Number(newStudent.monthlyFee);
      const now = new Date();
      const monthName = now.toLocaleString('default', { month: 'long' });
      const year = now.getFullYear();
      
      // Calculate due date based on fee policy
      let dueDate: string;
      if (newStudent.feePolicy === 'pay-after-study') {
        // Pay-After-Study: Due on 10th of NEXT month
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(10);
        dueDate = nextMonth.toISOString().split('T')[0];
      } else {
        // Advance: Due on 10th of current month (or today if past 10th)
        const tenthOfMonth = new Date(year, now.getMonth(), 10);
        dueDate = now.getDate() > 10 
          ? now.toISOString().split('T')[0] // Past 10th, due today
          : tenthOfMonth.toISOString().split('T')[0]; // Before 10th, due on 10th
      }

      const fee: FeeRecord = {
        id: `f${Date.now()}`,
        studentId,
        amount,
        dueDate,
        status: 'pending', // Always pending - teacher marks as paid in Fees section
        title: `${monthName} ${year} Monthly Fee`,
        type: 'monthly',
        month: monthName,
        year,
        feePolicy: newStudent.feePolicy,
        isFirstMonth: true,
        createdAt: new Date().toISOString()
      };
      await addFee(fee);
    }

    setIsModalOpen(false);
    setNewStudent({
      name: '',
      parentName: '',
      mobile: '',
      class: '',
      rollNo: '',
      batchId: batches[0]?.id || '',
      isIndividual: false,
      monthlyFee: '',
      feePolicy: 'advance'
    });
  };

  // If a student is selected, show detail view
  if (selectedStudentId) {
    return <StudentDetailView studentId={selectedStudentId} onClose={() => setSelectedStudentId(null)} />;
  }

  return (
    <div className="space-y-4 p-4">
      {/* Floating Action Button for Add */}
      <button 
        onClick={() => {
          const nextRoll = generateNextRollNo();
          const today = new Date().toISOString().split('T')[0];
          setNewStudent(prev => ({
            ...prev,
            rollNo: nextRoll || prev.rollNo,
            batchId: batches[0]?.id || prev.batchId || '',
            isIndividual: false
          }));
          setIsModalOpen(true);
        }}
        className="fixed bottom-20 right-4 z-50 bg-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
      >
        <Plus size={28} />
      </button>

      {/* Search Bar */}
      <div className="sticky top-0 z-10 bg-slate-50 pb-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search students..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              if (isSelectionMode) setSelectedIds(new Set());
            }}
            className={`px-4 rounded-xl border flex items-center justify-center transition-colors ${isSelectionMode ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            title={isSelectionMode ? "Cancel Selection" : "Select Multiple"}
          >
            <CheckSquare size={20} />
          </button>
          <button 
            onClick={() => setShowArchived(!showArchived)}
            className={`px-4 rounded-xl border flex items-center justify-center transition-colors ${showArchived ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            title={showArchived ? "Hide Archived" : "Show Archived"}
          >
            <Archive size={20} />
          </button>
        </div>
        {/* Selection Mode Toolbar */}
        {isSelectionMode && (
          <div className="mt-2 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <button
                onClick={selectAll}
                className="text-sm font-medium text-blue-700 hover:text-blue-900"
              >
                {selectedIds.size === filteredStudents.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-sm text-blue-600">
                {selectedIds.size} selected
              </span>
            </div>
            <button
              onClick={handleBulkDelete}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 size={16} />
              Delete Selected
            </button>
          </div>
        )}
      </div>

      {/* Student List (Cards) */}
      <div className="space-y-3 pb-20">
        {filteredStudents.map((student) => {
           // Handle legacy batchId or new batchIds
          const studentBatchId = student.batchIds?.[0];
          const batch = batches.find(b => b.id === studentBatchId);
          const isSelected = selectedIds.has(student.id);
          return (
            <div 
              key={student.id} 
              onClick={() => {
                if (isSelectionMode) {
                  toggleSelection(student.id);
                } else {
                  setSelectedStudentId(student.id);
                }
              }}
              className={`bg-white p-4 rounded-xl border shadow-sm flex items-start gap-4 active:scale-[0.99] transition-transform cursor-pointer ${isSelected ? 'border-blue-400 bg-blue-50' : 'border-slate-100'}`}
            >
              {/* Selection Checkbox or Avatar */}
              {isSelectionMode ? (
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {isSelected ? <CheckSquare size={24} /> : <Square size={24} />}
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg">
                  {student.name.charAt(0)}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-slate-900 truncate">{student.name}</h3>
                    <p className="text-xs text-slate-500">Roll: {student.rollNo}</p>
                  </div>
                  {batch ? (
                    <span className="text-[10px] px-2 py-1 rounded-full font-medium whitespace-nowrap bg-blue-100 text-blue-700">
                      {batch.name}
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-1 rounded-full font-medium whitespace-nowrap bg-slate-100 text-slate-600">
                      Individual
                    </span>
                  )}
                </div>
                
                <div className="mt-2 flex items-center gap-4">
                  <span className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                    Class {student.class}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-blue-600 font-medium px-2 py-1 rounded hover:bg-blue-50">
                    View Profile
                  </div>
                    <button
                      className="ml-2 text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded hover:bg-blue-100 border border-slate-200"
                      onClick={e => {
                        e.stopPropagation();
                        const url = `${import.meta.env.VITE_API_URL || '/api'}/attendance/report?studentId=${student.id}`;
                        fetch(url, { headers: { 'Accept': 'text/csv' } })
                          .then(res => res.blob())
                          .then(blob => {
                            const link = document.createElement('a');
                            link.href = window.URL.createObjectURL(blob);
                            link.download = `attendance_${student.name.replace(/\s+/g, '_')}.csv`;
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                          });
                      }}
                    >
                      Download Attendance
                    </button>

                      {/* Custom Date Range Download */}
                      <details className="ml-2 inline-block">
                        <summary className="text-xs text-blue-600 cursor-pointer select-none">Custom Range</summary>
                        <div className="flex flex-col gap-1 bg-white border border-slate-200 rounded p-2 mt-1 z-10">
                          <label className="text-xs text-slate-500">From:
                            <input type="date" className="ml-1 border rounded px-1 py-0.5 text-xs" id={`from_${student.id}`} />
                          </label>
                          <label className="text-xs text-slate-500">To:
                            <input type="date" className="ml-1 border rounded px-1 py-0.5 text-xs" id={`to_${student.id}`} />
                          </label>
                          <button
                            className="mt-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                            onClick={ev => {
                              ev.stopPropagation();
                              const from = (document.getElementById(`from_${student.id}`) as HTMLInputElement)?.value;
                              const to = (document.getElementById(`to_${student.id}`) as HTMLInputElement)?.value;
                              if (!from || !to) { alert('Select both dates'); return; }
                              const url = `${import.meta.env.VITE_API_URL || '/api'}/attendance/report?studentId=${student.id}&from=${from}&to=${to}`;
                              fetch(url, { headers: { 'Accept': 'text/csv' } })
                                .then(res => res.blob())
                                .then(blob => {
                                  const link = document.createElement('a');
                                  link.href = window.URL.createObjectURL(blob);
                                  link.download = `attendance_${student.name.replace(/\s+/g, '_')}_${from}_to_${to}.csv`;
                                  document.body.appendChild(link);
                                  link.click();
                                  link.remove();
                                });
                            }}
                          >
                            Download
                          </button>
                        </div>
                      </details>
                </div>
              </div>
            </div>
          );
        })}
        
        {filteredStudents.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <User size={48} className="mx-auto mb-2 opacity-50" />
            <p>No students found</p>
          </div>
        )}
      </div>

      {/* Add Student Modal (Full Screen on Mobile) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">New Admission</h3>
            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-red-500">
              <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Student Name</label>
                <input required type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} placeholder="Full Name" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Class</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={newStudent.class}
                    onChange={e => setNewStudent({...newStudent, class: e.target.value})}
                    placeholder="10th"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">Batch</label>
                    <button
                      type="button"
                      onClick={() => setNewStudent({...newStudent, isIndividual: !newStudent.isIndividual})}
                      className="text-xs px-2 py-1 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100"
                    >
                      {newStudent.isIndividual ? 'Individual' : 'Batch'}
                    </button>
                  </div>
                  {newStudent.isIndividual ? (
                    <div className="text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl px-3 py-2">
                      This student will study individually without being assigned to a batch.
                    </div>
                  ) : (
                    <select
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newStudent.batchId}
                      onChange={e => setNewStudent({...newStudent, batchId: e.target.value})}
                    >
                      {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  )}
                </div>
              </div>

               <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Roll No</label>
                <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={newStudent.rollNo} onChange={e => setNewStudent({...newStudent, rollNo: e.target.value})} placeholder="Roll No" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Email Address (Login ID)</label>
                <input required type="email" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={newStudent.email || ''} onChange={e => setNewStudent({...newStudent, email: e.target.value})} placeholder="student@email.com" />
                <p className="text-xs text-slate-500">Student will receive login instructions here.</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Parent Name</label>
                <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={newStudent.parentName} onChange={e => setNewStudent({...newStudent, parentName: e.target.value})} placeholder="Parent Name" />
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Phone Number</label>
                <input
                  required
                  type="tel"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={newStudent.mobile}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '');
                    if (digits.length <= 10) {
                      setNewStudent({...newStudent, mobile: digits});
                    }
                  }}
                  maxLength={10}
                  placeholder="10-digit Mobile Number"
                />
              </div>

              {/* Fee Configuration Section */}
              <div className="mt-4 border-t border-slate-200 pt-4">
                <h4 className="text-sm font-bold text-slate-800 mb-3">💰 Fee Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Monthly Fee (₹)</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newStudent.monthlyFee}
                      onChange={e => setNewStudent({ ...newStudent, monthlyFee: e.target.value })}
                      placeholder="e.g. 1500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Fee Policy</label>
                    <select
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newStudent.feePolicy}
                      onChange={e => setNewStudent({ 
                        ...newStudent, 
                        feePolicy: e.target.value as 'advance' | 'pay-after-study'
                      })}
                    >
                      <option value="advance">Advance (Pay before month)</option>
                      <option value="pay-after-study">Pay After Study (First month later)</option>
                    </select>
                    {newStudent.feePolicy === 'pay-after-study' && (
                      <p className="text-xs text-orange-600 mt-1">
                        ⚠️ First month fee will be due on 10th of next month
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Initial Fee Section - REMOVED */}

              <div className="pt-4">
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                  Complete Admission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

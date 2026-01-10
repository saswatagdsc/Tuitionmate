import React, { useState, useEffect } from 'react';
import { useData } from '../services/store';
import { Check, Calendar, Share2, Download, MessageCircle, Copy, X, FileSpreadsheet, CheckCircle, Layout, Coffee } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { Holidays } from './Holidays';

export const Attendance: React.FC = () => {
  const { batches, students, markAttendance, attendance, currentUser } = useData();
  const [activeTab, setActiveTab] = useState<'mark' | 'report' | 'holidays'>('mark');
  
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [markedStudents, setMarkedStudents] = useState<Set<string>>(new Set());
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Set initial batch
  useEffect(() => {
    if (!selectedBatchId && batches.length > 0) {
      setSelectedBatchId(batches[0].id);
    }
  }, [batches]);

  // Initialize marked students when batch changes (default all present)
  useEffect(() => {
    if (selectedBatchId) {
       const batchStudents = students.filter(s => s.batchIds?.includes(selectedBatchId) || (s as any).batchId === selectedBatchId);
       setMarkedStudents(new Set(batchStudents.map(s => s.id)));
       setIsSubmitted(false);
    }
  }, [selectedBatchId, students]);

  const batchStudents = students.filter(s => s.batchIds?.includes(selectedBatchId) || (s as any).batchId === selectedBatchId);
  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  const absentStudents = batchStudents.filter(s => !markedStudents.has(s.id));

  const toggleStudent = (id: string) => {
    const newSet = new Set(markedStudents);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setMarkedStudents(newSet);
  };

  const handleSave = async () => {
    const records = batchStudents.map(s => ({
      studentId: s.id,
      status: markedStudents.has(s.id) ? 'present' : 'absent'
    }));

    await markAttendance({
      id: `a${Date.now()}`,
      batchId: selectedBatchId,
      date: selectedDate,
      records: records as any // Cast to satisfy type if needed
    });
    setIsSubmitted(true);
  };

  const generateWhatsAppMessage = () => {
    if (absentStudents.length === 0) return '';
    const names = absentStudents.map(s => s.name).join(', ');
    return `Absent Report ${selectedDate}: The following students were absent today: ${names}. Please ensure regular attendance. - ${selectedBatch?.name}`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateWhatsAppMessage());
    alert("Message copied!");
  };

  const openWhatsApp = () => {
     const text = encodeURIComponent(generateWhatsAppMessage());
     window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const downloadAttendanceReport = () => {
    // Prepare attendance data
    const reportData: any[] = [];
    
    // Get all attendance records
    attendance.forEach(record => {
      const batch = batches.find(b => b.id === record.batchId);
      record.records.forEach(r => {
        const student = students.find(s => s.id === r.studentId);
        if (student) {
          reportData.push({
            'Date': record.date,
            'Student Name': student.name,
            'Roll No': student.rollNo,
            'Class': student.class,
            'Batch': batch?.name || 'Unknown',
            'Status': r.status,
            'Parent Contact': student.phone || '-'
          });
        }
      });
    });

    // Calculate summary statistics
    const summaryData: any[] = [];
    students.forEach(student => {
      const studentRecords = attendance.flatMap(a => 
        a.records.filter(r => r.studentId === student.id)
      );
      const totalClasses = studentRecords.length;
      const presentCount = studentRecords.filter(r => r.status === 'present').length;
      const absentCount = studentRecords.filter(r => r.status === 'absent').length;
      const lateCount = studentRecords.filter(r => r.status === 'late').length;
      const attendancePercentage = totalClasses > 0 ? ((presentCount / totalClasses) * 100).toFixed(2) : '0';
      
      if (totalClasses > 0) {
        summaryData.push({
          'Student Name': student.name,
          'Roll No': student.rollNo,
          'Class': student.class,
          'Total Classes': totalClasses,
          'Present': presentCount,
          'Absent': absentCount,
          'Late': lateCount,
          'Attendance %': attendancePercentage,
          'Parent Contact': student.phone || '-'
        });
      }
    });

    // Create workbook
    const wb = utils.book_new();
    
    // Attendance Log Sheet
    if (reportData.length > 0) {
      const ws1 = utils.json_to_sheet(reportData);
      ws1['!cols'] = [{wch: 12}, {wch: 20}, {wch: 10}, {wch: 10}, {wch: 15}, {wch: 10}, {wch: 15}];
      utils.book_append_sheet(wb, ws1, "Attendance Log");
    }
    
    // Summary Sheet
    if (summaryData.length > 0) {
      const ws2 = utils.json_to_sheet(summaryData);
      ws2['!cols'] = [{wch: 20}, {wch: 10}, {wch: 10}, {wch: 12}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 15}, {wch: 15}];
      utils.book_append_sheet(wb, ws2, "Summary");
    }

    // Download
    writeFile(wb, `Attendance_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4 border-b">
           <button 
             className={`pb-2 px-1 ${activeTab === 'mark' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-gray-500'}`}
             onClick={() => setActiveTab('mark')}
           >
             Mark Attendance
           </button>
           <button 
             className={`pb-2 px-1 ${activeTab === 'holidays' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-gray-500'}`}
             onClick={() => setActiveTab('holidays')}
           >
             Holidays & Calendar
           </button>
        </div>
        {currentUser?.role === 'teacher' && attendance.length > 0 && (
          <button
            onClick={downloadAttendanceReport}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            title="Download Attendance Report"
          >
            <Download size={18} />
            <span className="hidden md:inline">Export Report</span>
          </button>
        )}
      </div>

      {activeTab === 'holidays' && <Holidays />}

      {activeTab === 'mark' && (
        <>
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
            <select 
              className="p-2 border rounded-lg bg-white"
              value={selectedBatchId}
              onChange={e => setSelectedBatchId(e.target.value)}
            >
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.subject})</option>
              ))}
            </select>
            <input 
              type="date"
              className="p-2 border rounded-lg"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {batchStudents.map(student => {
              const isPresent = markedStudents.has(student.id);
              return (
                <div 
                  key={student.id}
                  onClick={() => !isSubmitted && toggleStudent(student.id)}
                  className={`cursor-pointer p-4 rounded-lg border-2 flex items-center justify-between transition-all
                    ${isPresent 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-red-500 bg-red-50'
                    } ${isSubmitted ? 'opacity-70 cursor-default' : 'hover:shadow-md'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
                      ${isPresent ? 'bg-green-500' : 'bg-red-500'}`}>
                      {student.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{student.name}</h3>
                      <p className="text-xs text-gray-500">Roll: {student.rollNo}</p>
                    </div>
                  </div>
                  <div>
                    {isPresent ? <Check className="text-green-600" /> : <X className="text-red-600" />}
                  </div>
                </div>
              );
            })}
            {batchStudents.length === 0 && <p className="text-gray-500 col-span-3 text-center py-6">No students in this batch.</p>}
          </div>

          {!isSubmitted ? (
             <button 
               onClick={handleSave}
               className="w-full md:w-auto bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 shadow-lg"
             >
               Submit Attendance
             </button>
          ) : (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 font-bold mb-2">
                <CheckCircle className="w-5 h-5" /> Attendance Recorded
              </div>
              {absentStudents.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600 mb-2">
                    {absentStudents.length} Students absent: {absentStudents.map(s => s.name).join(', ')}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={openWhatsApp} className="flex items-center gap-1 bg-green-500 text-white px-3 py-1.5 rounded text-sm hover:bg-green-600">
                      <Share2 className="w-4 h-4" /> WhatsApp Report
                    </button>
                    <button onClick={copyToClipboard} className="flex items-center gap-1 bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-300">
                      <Copy className="w-4 h-4" /> Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

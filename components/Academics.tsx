import React, { useState } from 'react';
import { useData } from '../services/store';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, X, Trash2 } from 'lucide-react';
import { ExamResult } from '../types';

export const Academics: React.FC = () => {
  const { exams, students, currentUser, addExamResult, deleteExamResult } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newResult, setNewResult] = useState<Partial<ExamResult>>({
    studentId: '',
    examName: '',
    date: new Date().toISOString().split('T')[0],
    marks: 0,
    totalMarks: 100,
    subject: '',
    remarks: ''
  });
  const [marksheetFile, setMarksheetFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResult.studentId || !newResult.examName || newResult.marks === undefined || !newResult.subject) return;

    let marksheetUrl = undefined;
    if (marksheetFile) {
      const formData = new FormData();
      formData.append('file', marksheetFile);
      // Optionally add more fields if backend expects
      const uploadRes = await fetch('/api/upload/marksheet', {
        method: 'POST',
        body: formData
      });
      if (uploadRes.ok) {
        const data = await uploadRes.json();
        marksheetUrl = data.url;
      }
    }

    addExamResult({
      id: `e${Date.now()}`,
      studentId: newResult.studentId,
      examName: newResult.examName,
      date: newResult.date!,
      marks: Number(newResult.marks),
      totalMarks: Number(newResult.totalMarks),
      subject: newResult.subject,
      marksheetUrl,
      remarks: newResult.remarks || ''
    });

    setIsModalOpen(false);
    setNewResult({
      studentId: '',
      examName: '',
      date: new Date().toISOString().split('T')[0],
      marks: 0,
      totalMarks: 100,
      subject: '',
      remarks: ''
    });
    setMarksheetFile(null);
  };

  // --- Student View ---
  if (currentUser?.role === 'student') {
     const myExams = exams.filter(e => e.studentId === currentUser.studentId);
     const myData = myExams.map(e => ({
        name: e.examName,
        score: Math.round((e.marks / e.totalMarks) * 100)
     }));

     return (
        <div className="space-y-6">
           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4">My Performance</h3>
            <div className="h-52 w-full">
               {myData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={myData}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                     <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                     <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                     <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                        itemStyle={{ color: '#fff' }}
                     />
                     <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#fff', stroke: '#2563eb', strokeWidth: 2 }} />
                  </LineChart>
                 </ResponsiveContainer>
               ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">No exam data available.</div>
               )}
            </div>
           </div>

           <div className="space-y-3">
              <h3 className="text-lg font-bold text-slate-900">Exam History</h3>
              {myExams.map(res => (
                  <div key={res.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">{res.examName}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{res.subject}</p>
                        {res.marksheetUrl && (
                          <a
                            href={res.marksheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 underline mt-1 block"
                          >
                            Download Marksheet
                          </a>
                        )}
                        {res.remarks && (
                          <div className="text-xs text-slate-500 mt-1">Remarks: {res.remarks}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold px-2 py-1 rounded text-green-600 bg-green-50`}>
                          {Math.round((res.marks / res.totalMarks) * 100)}%
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">{res.marks}/{res.totalMarks}</p>
                      </div>
                  </div>
              ))}
           </div>
        </div>
     );
  }

  // --- Teacher View ---
  // Prepare data for chart: Average marks per exam
  const examNames = Array.from(new Set(exams.map(e => e.examName)));
  
  const chartData = examNames.map(name => {
    const examResults = exams.filter(e => e.examName === name);
    const avg = examResults.reduce((a, b) => a + (b.marks / b.totalMarks) * 100, 0) / examResults.length;
    return {
      name,
      avg: Math.round(avg),
    };
  });


  // State for toggling between recent and all results
  const [showAll, setShowAll] = useState(false);
  const sortedResults = [...exams].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const resultsToShow = showAll ? sortedResults : sortedResults.slice(0, 5);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Academics</h2>
          <p className="text-slate-500">Exam Results & Performance</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2 font-medium"
        >
          <Plus size={18} /> Add Result
        </button>
      </div>

      {/* Chart Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Batch Performance Trend</h3>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Line type="monotone" dataKey="avg" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#fff', stroke: '#2563eb', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Results List */}
      <div>
        <div className="flex justify-between items-center mb-3 px-1">
           <h3 className="text-lg font-bold text-slate-900">{showAll ? 'All Results' : 'Recent Results'}</h3>
           <button
             className="text-xs text-blue-600 font-medium"
             onClick={() => setShowAll(v => !v)}
           >
             {showAll ? 'Show Recent' : 'View All'}
           </button>
        </div>
        <div className="space-y-3">
          {resultsToShow.map(res => {
              const student = students.find(s => s.id === res.studentId);
              const percentage = Math.round((res.marks / res.totalMarks) * 100);
              let colorClass = 'text-green-600 bg-green-50';
              if(percentage < 40) colorClass = 'text-red-600 bg-red-50';
              else if(percentage < 70) colorClass = 'text-yellow-600 bg-yellow-50';

              return (
                  <div key={res.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center group">
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">{student?.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{res.examName} • {res.subject}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className={`text-sm font-bold px-2 py-1 rounded ${colorClass}`}>{percentage}%</div>
                          <p className="text-[10px] text-slate-400 mt-1">{res.marks}/{res.totalMarks}</p>
                        </div>
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this exam result?')) deleteExamResult(res.id);
                          }}
                          className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                  </div>
              )
          })}
        </div>
      </div>

      {/* Add Result Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                   <Plus className="text-slate-700" size={20}/> Add Exam Result
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                   <X size={24} />
                </button>
             </div>
             
             <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                   <label className="text-sm font-bold text-slate-700">Student</label>
                   <select 
                     required
                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                     value={newResult.studentId}
                     onChange={(e) => setNewResult({...newResult, studentId: e.target.value})}
                   >
                     <option value="">Select Student</option>
                     {students.map(s => (
                       <option key={s.id} value={s.id}>{s.name} ({s.class})</option>
                     ))}
                   </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <label className="text-sm font-bold text-slate-700">Exam Name</label>
                     <input 
                       type="text" 
                       required
                       placeholder="e.g. Mid-Term"
                       className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                       value={newResult.examName}
                       onChange={(e) => setNewResult({...newResult, examName: e.target.value})}
                     />
                  </div>
                  <div className="space-y-1">
                     <label className="text-sm font-bold text-slate-700">Subject</label>
                     <input 
                       type="text" 
                       required
                       placeholder="e.g. Physics"
                       className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                       value={newResult.subject}
                       onChange={(e) => setNewResult({...newResult, subject: e.target.value})}
                     />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                     <label className="text-sm font-bold text-slate-700">Marks</label>
                     <input 
                       type="number" 
                       required
                       className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                       value={newResult.marks}
                       onChange={(e) => setNewResult({...newResult, marks: Number(e.target.value)})}
                     />
                  </div>
                  <div className="space-y-1">
                     <label className="text-sm font-bold text-slate-700">Total</label>
                     <input 
                       type="number" 
                       required
                       className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                       value={newResult.totalMarks}
                       onChange={(e) => setNewResult({...newResult, totalMarks: Number(e.target.value)})}
                     />
                  </div>
                  <div className="space-y-1">
                     <label className="text-sm font-bold text-slate-700">Date</label>
                     <input 
                       type="date" 
                       required
                       className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                       value={newResult.date}
                       onChange={(e) => setNewResult({...newResult, date: e.target.value})}
                     />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Marksheet (PDF/Image)</label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    onChange={e => setMarksheetFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Remarks</label>
                  <input
                    type="text"
                    placeholder="Enter remarks (optional)"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newResult.remarks}
                    onChange={e => setNewResult({ ...newResult, remarks: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-colors shadow-lg mt-2"
                >
                  Save Result
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
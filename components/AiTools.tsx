import React, { useState } from 'react';
import { useData } from '../services/store';
import { generateNotice, generateStudyTip } from '../services/gemini';
import { Sparkles, Send, Copy, BookOpen } from 'lucide-react';

// --- AI Grading Modal logic (reused from Batches) ---
const AiGradingModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { currentUser, batches, students } = useData();
  // For teachers: select batch and student
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  // For students: auto-select their batch and self
  const [studentImage, setStudentImage] = useState<File | null>(null);
  const [solutionKey, setSolutionKey] = useState('');
  const [maxMarks, setMaxMarks] = useState<number>(10);
  const [gradingResult, setGradingResult] = useState<any>(null);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [gradingError, setGradingError] = useState<string | null>(null);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] shadow-xl animate-in fade-in zoom-in duration-200 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-900">AI Grade Theory Paper</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <BookOpen size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form onSubmit={async e => {
            e.preventDefault();
            setGradingLoading(true);
            setGradingError(null);
            setGradingResult(null);
            try {
              let imageUrl = '';
              if (studentImage) {
                const formData = new FormData();
                formData.append('file', studentImage);
                // Auto-add teacherId
                if (currentUser?.role === 'teacher') {
                  formData.append('teacherId', currentUser.id);
                  formData.append('batchId', selectedBatchId);
                  formData.append('studentId', selectedStudentId);
                  // Optionally add student name/class for backend
                  const studentObj = students.find(s => s.id === selectedStudentId);
                  if (studentObj) {
                    formData.append('studentName', studentObj.name);
                    formData.append('studentClass', studentObj.class);
                  }
                } else if (currentUser?.role === 'student' && currentUser.teacherId) {
                  formData.append('teacherId', currentUser.teacherId);
                  formData.append('batchId', currentUser.batchId || (currentUser.batchIds?.[0] || ''));
                  formData.append('studentId', currentUser.id);
                  formData.append('studentName', currentUser.name);
                  formData.append('studentClass', currentUser.class);
                }
                const apiUrl = (import.meta as any).env?.VITE_API_URL || '/api';
                const uploadRes = await fetch(apiUrl + '/materials', {
                  method: 'POST',
                  body: formData
                });
                if (!uploadRes.ok) {
                  const errJson = await uploadRes.json().catch(() => ({}));
                  throw new Error(errJson?.error || 'Image upload failed');
                }
                const uploadJson = await uploadRes.json();
                imageUrl = uploadJson.url || uploadJson.secure_url;
              }
              if (!imageUrl) throw new Error('Image upload failed');
              // Simulate grading logic or call API here
              setTimeout(() => {
                setGradingResult({ total_marks_awarded: maxMarks, feedback_to_student: 'Sample feedback.' });
                setGradingLoading(false);
              }, 1000);
            } catch (err: any) {
              setGradingError(err.message || 'Error grading');
              setGradingLoading(false);
            }
          }} className="space-y-4">
            {currentUser?.role === 'teacher' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Batch</label>
                <select className="w-full p-2 border rounded mb-2" value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)} required>
                  <option value="">Select batch</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.subject})</option>
                  ))}
                </select>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Student</label>
                <select className="w-full p-2 border rounded" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} required>
                  <option value="">Select student</option>
                  {students.filter(s => s.batchIds?.includes(selectedBatchId)).map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.class})</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Student Answer Image</label>
              <input type="file" accept="image/*" required onChange={e => setStudentImage(e.target.files?.[0] || null)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ideal Solution (text)</label>
              <textarea required className="w-full p-2 border rounded" rows={3} value={solutionKey} onChange={e => setSolutionKey(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Marks</label>
              <input type="number" min={1} max={100} value={maxMarks} onChange={e => setMaxMarks(Number(e.target.value))} className="w-24 p-2 border rounded" />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors" disabled={gradingLoading}>
              {gradingLoading ? 'Grading...' : 'Grade with AI'}
            </button>
          </form>
          {gradingError && <div className="mt-4 text-red-600">{gradingError}</div>}
          {gradingResult && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
              <div><b>Marks Awarded:</b> {gradingResult.total_marks_awarded}</div>
              <div><b>Feedback:</b> {gradingResult.feedback_to_student}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const AiTools: React.FC<{ gradingTab?: boolean }> = ({ gradingTab }) => {
  const [activeTab, setActiveTab] = useState<'notice' | 'tips' | 'grading'>(gradingTab ? 'grading' : 'notice');
  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [tone, setTone] = useState<'formal' | 'casual' | 'urgent'>('formal');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateNotice = async () => {
    if (!topic) return;
    setIsLoading(true);
    setGeneratedContent('');
    const result = await generateNotice(topic, tone);
    setGeneratedContent(result);
    setIsLoading(false);
  };

  const handleGenerateTip = async () => {
    if (!subject) return;
    setIsLoading(true);
    setGeneratedContent('');
    const result = await generateStudyTip(subject);
    setGeneratedContent(result);
    setIsLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    alert('Copied to clipboard!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-900 flex items-center justify-center gap-2">
          <Sparkles className="text-purple-600" />
          AI Assistant
        </h2>
        <p className="text-slate-500">Generate professional notices or study tips instantly.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => { setActiveTab('notice'); setGeneratedContent(''); }}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'notice' ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Generate Notice
          </button>
          <button
            onClick={() => { setActiveTab('tips'); setGeneratedContent(''); }}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'tips' ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Study Tips
          </button>
          <button
            onClick={() => setActiveTab('grading')}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'grading' ? 'bg-yellow-50 text-yellow-700 border-b-2 border-yellow-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            AI Grading
          </button>
        </div>

        <div className="p-8">
          {activeTab === 'notice' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notice Topic</label>
                <input
                  type="text"
                  placeholder="e.g. Holiday on Friday, Fee Reminder, Test Postponed"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tone</label>
                <div className="flex gap-2">
                  {(['formal', 'casual', 'urgent'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`px-4 py-2 rounded-full text-sm capitalize border ${tone === t ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleGenerateNotice}
                disabled={isLoading || !topic}
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? 'Thinking...' : <><Sparkles size={18} /> Generate Notice</>}
              </button>
            </div>
          )}
          {activeTab === 'tips' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject / Concept</label>
                <input
                  type="text"
                  placeholder="e.g. Trigonometry, Thermodynamics, Mughal History"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <button
                onClick={handleGenerateTip}
                disabled={isLoading || !subject}
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? 'Searching...' : <><BookOpen size={18} /> Get Study Tip</>}
              </button>
            </div>
          )}
          {activeTab === 'grading' && (
            <div className="space-y-4">
              <button
                className="w-full bg-yellow-600 text-white py-3 rounded-xl font-bold hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2"
                onClick={() => setGradingModalOpen(true)}
              >
                <BookOpen size={20} /> Open AI Grading Modal
              </button>
              <p className="text-slate-500 text-center">Use AI to grade student answer sheets with live image upload.</p>
              <AiGradingModal open={gradingModalOpen} onClose={() => setGradingModalOpen(false)} />
            </div>
          )}

          {/* Result Area */}
          {generatedContent && activeTab !== 'grading' && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">AI Generated Output</span>
                <button onClick={copyToClipboard} className="text-slate-400 hover:text-purple-600 transition-colors">
                  <Copy size={16} />
                </button>
              </div>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap">
                {generatedContent}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

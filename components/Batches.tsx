// Fix for TypeScript: declare import.meta.env
declare global {
  interface ImportMeta {
    env: {
      VITE_API_URL?: string;
      [key: string]: any;
    };
  }
}
import React, { useState } from 'react';
import { gradeMathTheory } from '../services/gemini';
import { useData } from '../services/store';
import { Batch } from '../types';
import { Users, Clock, BookOpen, Plus, X, Edit2, Trash2, Calendar } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SUBJECT_PRESETS = [
  'Mathematics',
  'Science',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'Social Studies',
  'Computer Science'
];

export const Batches: React.FC = () => {
  const { batches, addBatch, updateBatch, deleteBatch, students } = useData();
  // AI Grading State
  const [gradingBatchId, setGradingBatchId] = useState<string | null>(null);
  const [studentImage, setStudentImage] = useState<File | null>(null);
  const [solutionKey, setSolutionKey] = useState<string>('');
  const [maxMarks, setMaxMarks] = useState<number>(10);
  const [gradingResult, setGradingResult] = useState<any>(null);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [gradingError, setGradingError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameError, setNameError] = useState('');
  const [duplicateAction, setDuplicateAction] = useState<'edit' | null>(null);
  const [duplicateBatchId, setDuplicateBatchId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState<Partial<Batch>>({
    name: '',
    subject: '',
    time: '',
    sessionDurationMinutes: undefined
  });

  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [timeMode, setTimeMode] = useState<'same' | 'per-day'>('same');
  const [sameTime, setSameTime] = useState('');
  const [perDayTimes, setPerDayTimes] = useState<Record<string, string>>({});
  const [subjectMode, setSubjectMode] = useState<'preset' | 'custom'>('preset');

  const getStudentCount = (batchId: string) => {
    return students.filter(s => s.batchIds?.includes(batchId)).length;
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handlePerDayTimeChange = (day: string, value: string) => {
    setPerDayTimes(prev => ({ ...prev, [day]: value }));
  };

  const resetForm = () => {
    setFormData({ name: '', subject: '', time: '', sessionDurationMinutes: undefined });
    setSelectedDays([]);
    setTimeMode('same');
    setSameTime('');
    setPerDayTimes({});
    setSubjectMode('preset');
    setNameError('');
    setIsEditing(false);
    setEditingId(null);
    setDuplicateAction(null);
    setDuplicateBatchId(null);
  };

  const openEditModal = (batch: Batch) => {
    setIsEditing(true);
    setEditingId(batch.id);
    setFormData({
      name: batch.name,
      subject: batch.subject,
      time: batch.time,
      sessionDurationMinutes: batch.sessionDurationMinutes
    });
    
    setSelectedDays(batch.days);
    
    // Parse time back to modes
    if (batch.time.includes(',')) {
      setTimeMode('per-day');
      const times: Record<string, string> = {};
      batch.time.split(',').forEach(t => {
        const [day, time] = t.trim().split(' ');
        times[day] = time;
      });
      setPerDayTimes(times);
    } else {
      setTimeMode('same');
      setSameTime(batch.time);
    }
    
    if (SUBJECT_PRESETS.includes(batch.subject)) {
      setSubjectMode('preset');
    } else {
      setSubjectMode('custom');
    }
    
    setIsModalOpen(true);
  };

  const checkNameUniqueness = (name: string, excludeId?: string) => {
    return batches.find(b => b.name.toLowerCase() === name.toLowerCase() && b.id !== excludeId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.subject) {
      alert('Please enter a batch name and subject.');
      return;
    }

    if (selectedDays.length === 0) {
      alert('Please select at least one day for this batch.');
      return;
    }

    // Check for unique name
    const existingBatch = checkNameUniqueness(formData.name, editingId);
    if (existingBatch) {
      setNameError(`Batch name "${formData.name}" already exists!`);
      setDuplicateAction('edit');
      setDuplicateBatchId(existingBatch.id);
      return;
    }

    let finalTime = '';

    if (timeMode === 'same') {
      if (!sameTime) {
        alert('Please choose a time for the selected days.');
        return;
      }
      finalTime = sameTime;
    } else {
      const missing = selectedDays.filter(d => !perDayTimes[d]);
      if (missing.length > 0) {
        alert(`Please set time for: ${missing.join(', ')}`);
        return;
      }
      finalTime = selectedDays
        .map(d => `${d} ${perDayTimes[d]}`)
        .join(', ');
    }

    const batchData: Batch = {
      id: editingId || '', // Empty string for new batches, server will generate UUID
      name: formData.name,
      subject: formData.subject,
      days: selectedDays,
      time: finalTime,
      sessionDurationMinutes: formData.sessionDurationMinutes
    };

    if (isEditing && editingId) {
      await updateBatch(editingId, batchData);
    } else {
      await addBatch(batchData);
    }
    
    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    console.log('Delete button clicked for batch ID:', id);
    const batch = batches.find(b => b.id === id);
    console.log('Batch found:', batch);
    
    if (!confirm(`Are you sure you want to delete batch "${batch?.name}"?`)) {
      console.log('Delete cancelled by user');
      return;
    }
    
    setIsDeleting(true);
    console.log('Starting deletion process for ID:', id);
    
    try {
      const success = await deleteBatch(id);
      console.log('Delete result:', success);
      
      if (success) {
        console.log('Batch deleted successfully');
      } else {
        alert('Failed to delete batch. Please try again.');
      }
    } catch (error) {
      console.error('Error during deletion:', error);
      alert('Error deleting batch. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditExisting = () => {
    if (duplicateBatchId) {
      const batch = batches.find(b => b.id === duplicateBatchId);
      if (batch) {
        setNameError('');
        setDuplicateAction(null);
        openEditModal(batch);
      }
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* AI Grading Modal */}
      {gradingBatchId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] shadow-xl animate-in fade-in zoom-in duration-200 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
              <h2 className="text-xl font-bold text-slate-900">AI Grade Theory Paper</h2>
              <button onClick={() => {
                setGradingBatchId(null);
                setStudentImage(null);
                setSolutionKey('');
                setGradingResult(null);
                setGradingError(null);
              }} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <form onSubmit={async e => {
                e.preventDefault();
                setGradingLoading(true);
                setGradingError(null);
                setGradingResult(null);
                try {
                  // Upload image to Cloudinary or get base64
                  let imageUrl = '';
                  if (studentImage) {
                    // Use a simple upload to server/materials endpoint (reuse existing infra)
                    const formData = new FormData();
                    formData.append('file', studentImage);
                    const uploadRes = await fetch((import.meta as any).env?.VITE_API_URL + '/materials', {
                      method: 'POST',
                      body: formData
                    });
                    const uploadJson = await uploadRes.json();
                    imageUrl = uploadJson.url || uploadJson.secure_url;
                  }
                  if (!imageUrl) throw new Error('Image upload failed');
                  const result = await gradeMathTheory(imageUrl, solutionKey, maxMarks);
                  setGradingResult(result);
                } catch (err: any) {
                  setGradingError(err.message || 'Error grading');
                } finally {
                  setGradingLoading(false);
                }
              }} className="space-y-4">
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
                  <div><b>Error Step:</b> {gradingResult.error_step_description}</div>
                  <div><b>Weakness Tag:</b> {gradingResult.weakness_tag}</div>
                  <div><b>Feedback:</b> {gradingResult.feedback_to_student}</div>
                  <div><b>Remedial Suggestion:</b> {gradingResult.remedial_topic_suggestion}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Batches & Classes</h1>
          <p className="text-slate-500">Manage your class groups and subjects</p>
        </div>
        <button 
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} /> New Batch
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {batches.map(batch => (
          <div key={batch.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                <Users size={24} />
              </div>
              <div className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-600">
                {getStudentCount(batch.id)} Students
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-1">{batch.name}</h3>
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <BookOpen size={16} />
              <span>{batch.subject}</span>
            </div>

            {batch.sessionDurationMinutes && (
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                <Clock size={16} />
                <span>{batch.sessionDurationMinutes} mins/class</span>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
                <Clock size={16} />
                <span>{batch.time || 'Time not set'}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(batch)}
                  disabled={isDeleting}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit2 size={16} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(batch.id)}
                  disabled={isDeleting}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 px-3 py-2 rounded-lg font-medium hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={16} /> {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  onClick={() => setGradingBatchId(batch.id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-yellow-50 text-yellow-700 px-3 py-2 rounded-lg font-medium hover:bg-yellow-100 transition-colors"
                >
                  <BookOpen size={16} /> AI Grade Theory
                </button>
                  <button
                    onClick={() => {
                      const url = `${import.meta.env.VITE_API_URL || '/api'}/attendance/report?batchId=${batch.id}`;
                      fetch(url, { headers: { 'Accept': 'text/csv' } })
                        .then(res => res.blob())
                        .then(blob => {
                          const link = document.createElement('a');
                          link.href = window.URL.createObjectURL(blob);
                          link.download = `attendance_${batch.name.replace(/\s+/g, '_')}.csv`;
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                        });
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg font-medium hover:bg-green-100 transition-colors"
                  >
                    <Calendar size={16} /> Download Attendance
                  </button>
                  <details className="flex-1 inline-block ml-2">
                    <summary className="text-xs text-green-700 cursor-pointer select-none">Custom Range</summary>
                    <div className="flex flex-col gap-1 bg-white border border-slate-200 rounded p-2 mt-1 z-10">
                      <label className="text-xs text-slate-500">From:
                        <input type="date" className="ml-1 border rounded px-1 py-0.5 text-xs" id={`from_batch_${batch.id}`} />
                      </label>
                      <label className="text-xs text-slate-500">To:
                        <input type="date" className="ml-1 border rounded px-1 py-0.5 text-xs" id={`to_batch_${batch.id}`} />
                      </label>
                      <button
                        className="mt-1 text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                        onClick={ev => {
                          ev.stopPropagation();
                          const from = (document.getElementById(`from_batch_${batch.id}`) as HTMLInputElement)?.value;
                          const to = (document.getElementById(`to_batch_${batch.id}`) as HTMLInputElement)?.value;
                          if (!from || !to) { alert('Select both dates'); return; }
                          const url = `${import.meta.env.VITE_API_URL || '/api'}/attendance/report?batchId=${batch.id}&from=${from}&to=${to}`;
                          fetch(url, { headers: { 'Accept': 'text/csv' } })
                            .then(res => res.blob())
                            .then(blob => {
                              const link = document.createElement('a');
                              link.href = window.URL.createObjectURL(blob);
                              link.download = `attendance_${batch.name.replace(/\s+/g, '_')}_${from}_to_${to}.csv`;
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
        ))}

        {batches.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={32} />
            </div>
            <p>No batches found. Create your first batch to start adding students.</p>
          </div>
        )}
      </div>

      {/* Batch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] shadow-xl animate-in fade-in zoom-in duration-200 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
              <h2 className="text-xl font-bold text-slate-900">{isEditing ? 'Edit Batch' : 'Create New Batch'}</h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {nameError && duplicateAction === 'edit' ? (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 font-medium mb-3">{nameError}</p>
                  <button
                    onClick={handleEditExisting}
                    className="w-full bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    Edit Existing Batch Instead
                  </button>
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Batch Name</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Class 10 - Morning"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.name}
                    onChange={e => {
                      setFormData({...formData, name: e.target.value});
                      setNameError('');
                    }}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                  <select
                    required={subjectMode === 'preset'}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    value={subjectMode === 'preset' ? formData.subject || '' : '__custom__'}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '__custom__') {
                        setSubjectMode('custom');
                        setFormData(prev => ({ ...prev, subject: '' }));
                      } else {
                        setSubjectMode('preset');
                        setFormData(prev => ({ ...prev, subject: val }));
                      }
                    }}
                  >
                    <option value="" disabled>Select subject</option>
                    {SUBJECT_PRESETS.map(subj => (
                      <option key={subj} value={subj}>{subj}</option>
                    ))}
                    <option value="__custom__">Other (Custom)</option>
                  </select>

                  {subjectMode === 'custom' && (
                    <input
                      required
                      type="text"
                      placeholder="Enter subject name"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      value={formData.subject || ''}
                      onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Class Duration (Minutes)</label>
                  <input
                    type="number"
                    placeholder="e.g. 45, 60, 90"
                    min="5"
                    max="480"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.sessionDurationMinutes || ''}
                    onChange={e => setFormData({...formData, sessionDurationMinutes: e.target.value ? parseInt(e.target.value) : undefined})}
                  />
                </div>

                {/* Day Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Days in Week (max 7)</label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map(day => {
                      const active = selectedDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            active
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Mode */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time for Selected Days</label>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setTimeMode('same')}
                      className={`flex-1 px-3 py-2 rounded-xl border font-medium ${
                        timeMode === 'same'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      Same time for all
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeMode('per-day')}
                      className={`flex-1 px-3 py-2 rounded-xl border font-medium ${
                        timeMode === 'per-day'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      Per day
                    </button>
                  </div>

                  {timeMode === 'same' ? (
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Time</label>
                      <input
                        type="time"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        value={sameTime}
                        onChange={e => setSameTime(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {selectedDays.length === 0 && (
                        <p className="text-xs text-slate-400">Select at least one day above, then set time for each.</p>
                      )}
                      {selectedDays.map(day => (
                        <div key={day} className="flex items-center gap-3">
                          <span className="w-10 text-xs font-medium text-slate-600">{day}</span>
                          <input
                            type="time"
                            className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            value={perDayTimes[day] || ''}
                            onChange={e => handlePerDayTimeChange(day, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 mt-2"
                >
                  {isEditing ? 'Update Batch' : 'Create Batch'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

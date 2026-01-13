import React, { useState } from 'react';
import { useData } from '../services/store';
import { StudyMaterial } from '../types';
import { BookOpen, Link as LinkIcon, FileText, Video, Upload, Trash2 } from 'lucide-react';


export const StudyMaterials: React.FC = () => {
  const { studyMaterials, currentUser, students, batches, addStudyMaterial, deleteStudyMaterial } = useData();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<StudyMaterial>>({});
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Get current student info
  let student = null;
  if (currentUser?.role === 'student') {
    student = students.find(s => s.id === currentUser.studentId);
  }

  // Only show materials for student's batch/class/teacher
  let filteredMaterials = studyMaterials;
  if (student) {
    filteredMaterials = studyMaterials.filter(m => {
      const batchMatch = m.batchId && student?.batchIds?.includes(m.batchId);
      const classMatch = m.class && m.class === student.class;
      const teacherMatch = m.teacherId && m.teacherId === student.teacherId;
      return batchMatch || classMatch || teacherMatch;
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.subject || !formData.type || !formData.batchId) {
      alert('Please fill all required fields and select a batch.');
      return;
    }
    
    let materialUrl = formData.url || '';
    
    // If type is 'pdf' or 'image' and there's a file input, upload to Cloudinary via the backend
    if ((formData.type === 'pdf' || formData.type === 'image') && formData.file) {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', formData.file);
        fd.append('teacherId', currentUser?.id || '');
        fd.append('title', formData.title);
        fd.append('subject', formData.subject);
        fd.append('class', formData.class || '');
        fd.append('batchId', formData.batchId);
        fd.append('type', formData.type);

        const res = await fetch('/api/materials', { method: 'POST', body: fd });
        if (res.ok) {
          const newMaterial = await res.json();
          materialUrl = newMaterial.url;
          setShowForm(false);
          setFormData({});
          setUploading(false);
          alert('Material uploaded and students will be notified.');
          return;
        } else {
          const err = await res.json();
          alert('Upload failed: ' + err.error);
          setUploading(false);
          return;
        }
      } catch (err) {
        alert('Upload error: ' + err);
        setUploading(false);
        return;
      }
    }
    
    if (!materialUrl) {
      alert('Please provide a URL or upload a file.');
      return;
    }

    // Compose material object
    await addStudyMaterial({
      ...formData,
      url: materialUrl,
      id: `mat_${Date.now()}`,
      uploadDate: new Date().toISOString(),
    } as StudyMaterial);
    setShowForm(false);
    setFormData({});
    alert('Material uploaded and students in the batch will be notified.');
  };

  const getIcon = (type: StudyMaterial['type']) => {
    switch (type) {
      case 'video': return <Video className="w-5 h-5 text-red-500" />;
      case 'link': return <LinkIcon className="w-5 h-5 text-blue-500" />;
      default: return <FileText className="w-5 h-5 text-orange-500" />;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6" /> LMS Lite (Study Materials)
        </h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          + Upload Material
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold mb-4">Add Study Material</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              placeholder="Title"
              className="p-2 border rounded"
              required
              value={formData.title || ''}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
             <input
              placeholder="Subject"
              className="p-2 border rounded"
              value={formData.subject || ''}
              onChange={e => setFormData({...formData, subject: e.target.value})}
            />
            <select
              required
              className="p-2 border rounded"
              value={formData.batchId || ''}
              onChange={e => setFormData({...formData, batchId: e.target.value})}
            >
              <option value="">Select Batch</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.subject})</option>
              ))}
            </select>
            <select
              required
              className="p-2 border rounded"
              value={formData.type || ''}
              onChange={e => setFormData({...formData, type: e.target.value as any})}
            >
              <option value="">Select Type</option>
              <option value="pdf">PDF Document</option>
              <option value="video">Video URL</option>
              <option value="link">External Link</option>
              <option value="image">Image</option>
            </select>
            
            {(formData.type === 'video' || formData.type === 'link') ? (
              <input
                placeholder="URL / File Link"
                className="p-2 border rounded md:col-span-2"
                required
                value={formData.url || ''}
                onChange={e => setFormData({...formData, url: e.target.value})}
              />
            ) : (
              <input
                type="file"
                className="p-2 border rounded md:col-span-2"
                onChange={e => setFormData({...formData, file: e.target.files?.[0]})}
              />
            )}
            <button 
              type="submit" 
              className="md:col-span-2 bg-purple-600 text-white p-2 rounded hover:bg-purple-700 disabled:opacity-50"
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Material'}
            </button>
            <button 
              type="button" 
              onClick={() => setShowForm(false)}
              className="md:col-span-2 px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMaterials.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow relative group">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-gray-50 rounded-lg">
                {getIcon(item.type)}
              </div>
              <div className="flex items-center gap-2">
                {currentUser?.role === 'teacher' && (
                  <button
                    onClick={() => setDeleteConfirm(item.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete material"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <span className="text-xs text-gray-500">{item.uploadDate}</span>
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
              <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs">{item.subject}</span>
              <span className="text-xs">• Class {item.class}</span>
            </div>
            <a 
              href={item.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full text-center py-2 border border-gray-200 rounded text-sm font-medium hover:bg-gray-50 text-gray-700"
            >
              View Material
            </a>

            {deleteConfirm === item.id && (
              <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center rounded-lg">
                <div className="bg-white rounded-lg p-4 shadow-lg">
                  <p className="font-semibold text-gray-900 mb-4">Delete this material?</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-3 py-1.5 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        deleteStudyMaterial(item.id);
                        setDeleteConfirm(null);
                      }}
                      className="px-3 py-1.5 text-white bg-red-500 rounded hover:bg-red-600 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

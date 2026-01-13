import React, { useState } from 'react';
import { useData } from '../services/store';
import { StudyMaterial } from '../types';
import { BookOpen, Link as LinkIcon, FileText, Video, Upload } from 'lucide-react';


export const StudyMaterials: React.FC = () => {
  const { studyMaterials, currentUser, students, batches, addStudyMaterial } = useData();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<StudyMaterial>>({});

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
    if (!formData.title || !formData.subject || !formData.type || !formData.url || !formData.batchId) {
      alert('Please fill all required fields and select a batch.');
      return;
    }
    // Compose material object
    await addStudyMaterial({
      ...formData,
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
              <div className="md:col-span-2">
                 <label className="block text-sm font-medium text-gray-700 mb-1">Upload File (Max 10MB)</label>
                 <input
                  type="file"
                  accept={formData.type === 'pdf' ? "application/pdf" : "image/*"}
                  className="p-2 border rounded w-full"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 10 * 1024 * 1024) {
                        alert("File too large. Max 10MB allowed.");
                        e.target.value = '';
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData({...formData, url: reader.result as string});
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                {formData.url && <p className="text-xs text-green-600 mt-1">File selected</p>}
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button 
              type="button" 
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Upload
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMaterials.map((item) => {
          // For files, use secure download endpoint
          const isFile = item.type === 'pdf' || item.type === 'image';
          let viewUrl = item.url;
          if (isFile && currentUser?.role === 'student') {
            viewUrl = `/api/materials/${item.id}/download?studentId=${currentUser.studentId}`;
          }
          return (
            <div key={item.id} className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-gray-50 rounded-lg">
                  {getIcon(item.type)}
                </div>
                <span className="text-xs text-gray-500">{item.uploadDate}</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs">{item.subject}</span>
                <span className="text-xs">• Class {item.class}</span>
              </div>
              <a 
                href={viewUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full text-center py-2 border border-gray-200 rounded text-sm font-medium hover:bg-gray-50 text-gray-700"
              >
                View Material
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
};

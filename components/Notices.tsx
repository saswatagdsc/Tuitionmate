
import React, { useState, useEffect } from 'react';
import { useData } from '../services/store';
import { Bell, Calendar, Plus, X, Megaphone, Users } from 'lucide-react';


export const Notices: React.FC = () => {
  const { notices, currentUser, batches, addNotice } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetBatchId, setTargetBatchId] = useState('all');
  const [filteredNotices, setFilteredNotices] = useState(notices);

  useEffect(() => {
    // Refetch or filter notices for student
    if (currentUser?.role === 'student') {
      setFilteredNotices(
        notices.filter(n => {
          const noticeBatchId = n.batchId || 'all';
          return noticeBatchId === 'all' || noticeBatchId === currentUser.batchId;
        })
      );
    } else {
      setFilteredNotices(notices);
    }
  }, [notices, currentUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    addNotice({
      id: `n${Date.now()}`,
      title,
      content,
      date: new Date().toISOString().split('T')[0],
      batchId: targetBatchId,
      teacherId: currentUser?.role === 'teacher' ? currentUser.id : undefined
    });
    setIsModalOpen(false);
    setTitle('');
    setContent('');
    setTargetBatchId('all');
  };

  const getBatchName = (id: string) => {
    if (id === 'all') return 'All Students';
    return batches.find(b => b.id === id)?.name || 'Unknown Batch';
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Notice Board</h2>
          <p className="text-slate-500">Announcements & Updates</p>
        </div>
        {currentUser?.role === 'teacher' && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2 font-medium"
          >
            <Plus size={18} /> Post Notice
          </button>
        )}
      </div>

      <div className="space-y-4">
        {filteredNotices.map((notice) => (
          <div key={notice.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${notice.batchId === 'all' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
            
            <div className="flex justify-between items-start mb-2 pl-3">
              <div className="flex flex-col">
                 <h3 className="text-lg font-bold text-slate-900">{notice.title}</h3>
                 <div className="flex items-center gap-3 mt-1 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(notice.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'})}</span>
                    <span className={`px-2 py-0.5 rounded-full ${notice.batchId === 'all' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                       {getBatchName(notice.batchId)}
                    </span>
                 </div>
              </div>
              <div className={`p-2 rounded-full ${notice.batchId === 'all' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                {notice.batchId === 'all' ? <Megaphone size={18} /> : <Users size={18} />}
              </div>
            </div>
            
            <p className="text-slate-600 text-sm leading-relaxed pl-3 mt-3">
              {notice.content}
            </p>
          </div>
        ))}

        {filteredNotices.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bell size={32} />
            </div>
            <p className="text-slate-500">No notices found.</p>
          </div>
        )}
      </div>

      {/* Add Notice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                   <Megaphone className="text-slate-700" size={20}/> Post New Notice
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                   <X size={24} />
                </button>
             </div>
             
             <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                   <label className="text-sm font-bold text-slate-700">Target Audience</label>
                   <select 
                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                     value={targetBatchId}
                     onChange={(e) => setTargetBatchId(e.target.value)}
                   >
                     <option value="all">Everyone (All Batches)</option>
                     {batches.map(b => (
                       <option key={b.id} value={b.id}>{b.name}</option>
                     ))}
                   </select>
                   <p className="text-xs text-slate-400 pl-1">Selecting "Everyone" sends to all students.</p>
                </div>

                <div className="space-y-1">
                   <label className="text-sm font-bold text-slate-700">Title</label>
                   <input 
                     type="text" 
                     required
                     placeholder="e.g. Holiday Announcement"
                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                     value={title}
                     onChange={(e) => setTitle(e.target.value)}
                   />
                </div>

                <div className="space-y-1">
                   <label className="text-sm font-bold text-slate-700">Message</label>
                   <textarea 
                     required
                     rows={4}
                     placeholder="Type your notice here..."
                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                     value={content}
                     onChange={(e) => setContent(e.target.value)}
                   />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-colors shadow-lg mt-2 flex justify-center items-center gap-2"
                >
                  <Bell size={20} /> Publish Notice
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../services/store';
import { Send, User, Bot, Users } from 'lucide-react';

export const Chat: React.FC = () => {
  const { messages, currentUser, batches, sendMessage } = useData();
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set initial batch when data loads
  useEffect(() => {
    if (!selectedBatchId && batches.length > 0) {
      if (currentUser?.role === 'student' && currentUser?.batchId) {
        setSelectedBatchId(currentUser.batchId);
      } else {
        setSelectedBatchId(batches[0].id);
      }
    }
  }, [batches, currentUser, selectedBatchId]);

  const filteredMessages = messages.filter(m => m.batchId === selectedBatchId);
  const selectedBatch = batches.find(b => b.id === selectedBatchId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      sendMessage(selectedBatchId, text);
      setText('');
    }
  };

  if (!selectedBatch) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-64 text-center text-slate-500">
        <div className="bg-slate-100 p-4 rounded-full mb-3">
          <Users size={32} className="text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-700">No Chat Found</h3>
        <p className="text-sm max-w-xs mx-auto mt-1">
          {batches.length === 0 
            ? "Create a batch first to enable group discussions." 
            : "Select a batch to start chatting."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] md:h-[calc(100vh-140px)] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
        {currentUser?.role === 'teacher' ? (
           <div className="flex-1">
             <select 
               className="w-full md:w-auto bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
               value={selectedBatchId}
               onChange={(e) => setSelectedBatchId(e.target.value)}
             >
               {batches.map(b => (
                 <option key={b.id} value={b.id}>{b.name}</option>
               ))}
             </select>
           </div>
        ) : (
          <div className="flex items-center gap-2">
             <div className="p-2 bg-blue-100 rounded-full text-blue-600">
               <Users size={18} />
             </div>
             <div>
               <h3 className="font-bold text-slate-900">{selectedBatch.name}</h3>
               <p className="text-xs text-slate-500">Group Discussion</p>
             </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {filteredMessages.length === 0 && (
          <div className="text-center text-slate-400 text-sm py-10">No messages yet. Start the conversation!</div>
        )}
        {filteredMessages.map(msg => {
           const isMe = msg.senderId === currentUser?.id;
           const isTeacher = msg.role === 'teacher';
           return (
             <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
               <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                 isMe 
                   ? 'bg-blue-600 text-white rounded-br-none' 
                   : isTeacher 
                     ? 'bg-slate-800 text-white rounded-bl-none'
                     : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
               }`}>
                 {!isMe && (
                   <p className={`text-[10px] font-bold mb-1 opacity-75 ${isTeacher ? 'text-blue-300' : 'text-slate-500'}`}>
                     {msg.senderName} {isTeacher && '(Teacher)'}
                   </p>
                 )}
                 <p className="text-sm">{msg.text}</p>
                 <p className={`text-[9px] mt-1 text-right opacity-60`}>
                   {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </p>
               </div>
             </div>
           );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200 flex gap-2">
        <input
          type="text"
          placeholder="Type a message..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button 
          type="submit"
          disabled={!text.trim()}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};
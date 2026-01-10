import React, { useState } from 'react';
import { useData } from '../services/store';
import { Calendar as CalendarIcon, Clock, AlertCircle, Plus, X, Trash2 } from 'lucide-react';
import { BatchSlot, Batch } from '../types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIMES = [
  '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00', 
  '18:00', '19:00', '20:00'
];

// Preset Colors
const COLORS = [
  { label: 'Blue', value: 'bg-blue-100 text-blue-800 border-blue-200' },
  { label: 'Green', value: 'bg-green-100 text-green-800 border-green-200' },
  { label: 'Purple', value: 'bg-purple-100 text-purple-800 border-purple-200' },
  { label: 'Orange', value: 'bg-orange-100 text-orange-800 border-orange-200' },
  { label: 'Red', value: 'bg-red-100 text-red-800 border-red-200' },
  { label: 'Teal', value: 'bg-teal-100 text-teal-800 border-teal-200' },
];

export const Schedule: React.FC = () => {
  const { batches, updateBatch, addBatch, currentUser } = useData();
  const [draggedSlot, setDraggedSlot] = useState<{ batchId: string, slotId: string } | null>(null);
  
  // Add Batch Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBatch, setNewBatch] = useState<Partial<Batch> & { slots: BatchSlot[] }>({
    name: '',
    subject: '',
    color: COLORS[0].value,
    slots: []
  });
  
  // Temporary state for adding a slot in the modal
  const [tempSlot, setTempSlot] = useState<Partial<BatchSlot>>({
    day: 'Mon',
    time: '17:00',
    duration: 60
  });

  const handleDragStart = (e: React.DragEvent, batchId: string, slotId: string) => {
    setDraggedSlot({ batchId, slotId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, day: string, time: string) => {
    e.preventDefault();
    if (!draggedSlot) return;

    const batch = batches.find(b => b.id === draggedSlot.batchId);
    if (!batch) return;

    // If batch has slots, update them
    if (batch.slots && batch.slots.length > 0) {
      const newSlots = batch.slots.map(slot => {
        if (slot.id === draggedSlot.slotId) {
          return { ...slot, day, time };
        }
        return slot;
      });

      newSlots.sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day));
      const daysStr = Array.from(new Set(newSlots.map(s => s.day))).join(', ');

      updateBatch(batch.id, {
        slots: newSlots,
        schedule: `${daysStr} (Updated)`
      });
    } else {
      // Update the batch days and time directly
      updateBatch(batch.id, {
        days: [day],
        time: time
      });
    }

    setDraggedSlot(null);
    alert(`Class moved to ${day} at ${formatTime(time)}.`);
  };

  // Helper to format time for display
  const formatTime = (time: string) => {
     return new Date('2000-01-01T' + time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  // --- Add Batch Handlers ---

  const addSlotToNewBatch = () => {
    if (!tempSlot.day || !tempSlot.time) return;
    const newSlot: BatchSlot = {
      id: `bs${Date.now()}`,
      day: tempSlot.day,
      time: tempSlot.time,
      duration: tempSlot.duration || 60
    };
    setNewBatch(prev => ({ ...prev, slots: [...prev.slots, newSlot] }));
  };

  const removeSlotFromNewBatch = (id: string) => {
    setNewBatch(prev => ({ ...prev, slots: prev.slots.filter(s => s.id !== id) }));
  };

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatch.name || !newBatch.subject) return;

    // Generate Schedule String and derive days/time from slots
    const uniqueDays = Array.from(new Set(newBatch.slots.map(s => s.day))).sort((a,b) => DAYS.indexOf(a) - DAYS.indexOf(b));
    const uniqueTimes = Array.from(new Set(newBatch.slots.map(s => s.time)));
    const scheduleStr = newBatch.slots.length > 0 
      ? `${uniqueDays.join(', ')} ${uniqueTimes[0] ? formatTime(uniqueTimes[0]) : ''}` 
      : 'No Schedule';

    addBatch({
      id: `b${Date.now()}`,
      name: newBatch.name,
      subject: newBatch.subject,
      days: uniqueDays.length > 0 ? uniqueDays : ['Mon'],
      time: uniqueTimes[0] || '17:00',
      color: newBatch.color || COLORS[0].value,
      slots: newBatch.slots,
      schedule: scheduleStr
    });

    setIsAddModalOpen(false);
    setNewBatch({ name: '', subject: '', color: COLORS[0].value, slots: [] });
  };

  return (
    <div className="space-y-6 h-full flex flex-col pb-20">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Weekly Schedule</h2>
          <p className="text-slate-500">Manage batches and timings.</p>
        </div>
        {currentUser?.role === 'teacher' && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2 font-medium"
          >
            <Plus size={18} /> Add Batch
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto border border-slate-200 rounded-xl bg-white shadow-sm">
        <div className="min-w-[800px]">
          {/* Header Row */}
          <div className="grid grid-cols-8 border-b border-slate-200 sticky top-0 bg-white z-10">
            <div className="p-4 font-bold text-slate-400 text-xs uppercase tracking-wide border-r border-slate-100 flex items-center justify-center">
               <Clock size={16} />
            </div>
            {DAYS.map(day => (
              <div key={day} className="p-4 font-bold text-slate-700 text-center border-r border-slate-100 last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Time Rows */}
          {TIMES.map(time => (
            <div key={time} className="grid grid-cols-8 border-b border-slate-100">
              {/* Time Column */}
              <div className="p-3 text-xs font-medium text-slate-400 text-center border-r border-slate-100 -mt-2">
                {formatTime(time)}
              </div>

              {/* Day Cells */}
              {DAYS.map(day => {
                // Find if any batch has a slot here (either from slots array or from days/time)
                const activeBatchSlot = batches.flatMap(b => {
                  // If batch has slots array, use that
                  if (b.slots && b.slots.length > 0) {
                    return b.slots.map(s => ({ ...s, batch: b }));
                  }
                  // Otherwise, derive slots from days and time
                  if (b.days && b.time) {
                    return b.days.map(d => ({
                      id: `${b.id}-${d}`,
                      day: d,
                      time: b.time.split(':').length === 2 ? b.time : '17:00',
                      duration: b.sessionDurationMinutes || 60,
                      batch: b
                    }));
                  }
                  return [];
                }).find(s => s.day === day && s.time === time);

                return (
                  <div 
                    key={`${day}-${time}`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, day, time)}
                    className={`min-h-[80px] border-r border-slate-100 p-1 relative group transition-colors ${!activeBatchSlot ? 'hover:bg-slate-50' : ''}`}
                  >
                    {activeBatchSlot && (
                      <div
                        draggable={currentUser?.role === 'teacher'}
                        onDragStart={(e) => handleDragStart(e, activeBatchSlot.batch.id, activeBatchSlot.id)}
                        className={`w-full h-full rounded-lg p-2 text-xs cursor-move shadow-sm hover:shadow-md transition-all ${activeBatchSlot.batch.color || 'bg-blue-100 text-blue-800 border-blue-200'} bg-opacity-10 border-l-4`}
                        style={{ borderColor: 'currentColor' }}
                      >
                         <p className="font-bold text-slate-900 truncate">{activeBatchSlot.batch.subject}</p>
                         <p className="opacity-75 truncate">{activeBatchSlot.batch.name}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {currentUser?.role === 'teacher' && (
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
           <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={20} />
           <div>
              <h4 className="font-bold text-blue-900 text-sm">Automatic Notifications</h4>
              <p className="text-blue-700 text-xs mt-1">
                 Dragging a class to a new time slot will automatically create a notice for all students in that batch informing them of the schedule change.
              </p>
           </div>
        </div>
      )}

      {/* Add Batch Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                   <Plus className="text-slate-700" size={20}/> Create New Batch
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                   <X size={24} />
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-700">Batch Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Class 11 - Chem"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newBatch.name}
                      onChange={e => setNewBatch({...newBatch, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-700">Subject</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Chemistry"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newBatch.subject}
                      onChange={e => setNewBatch({...newBatch, subject: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Color Tag</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map(c => (
                      <button
                        key={c.label}
                        type="button"
                        onClick={() => setNewBatch({...newBatch, color: c.value})}
                        className={`w-8 h-8 rounded-full border-2 ${newBatch.color === c.value ? 'border-slate-800 scale-110' : 'border-transparent'} ${c.value.split(' ')[0]}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Slot Manager */}
                <div className="border-t border-slate-100 pt-4">
                   <label className="text-sm font-bold text-slate-700 mb-2 block">Class Schedule</label>
                   
                   {/* Slot List */}
                   <div className="space-y-2 mb-4">
                     {newBatch.slots.map(slot => (
                       <div key={slot.id} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200 text-sm">
                          <span>{slot.day}, {formatTime(slot.time)} ({slot.duration} mins)</span>
                          <button onClick={() => removeSlotFromNewBatch(slot.id)} className="text-red-500 hover:text-red-700 p-1">
                            <Trash2 size={16} />
                          </button>
                       </div>
                     ))}
                     {newBatch.slots.length === 0 && <p className="text-xs text-slate-400 italic">No slots added yet.</p>}
                   </div>

                   {/* Add Slot Controls */}
                   <div className="flex gap-2 items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs font-bold text-slate-500">Day</label>
                        <select 
                          className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                          value={tempSlot.day}
                          onChange={e => setTempSlot({...tempSlot, day: e.target.value})}
                        >
                          {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-xs font-bold text-slate-500">Time</label>
                        <select 
                          className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                          value={tempSlot.time}
                          onChange={e => setTempSlot({...tempSlot, time: e.target.value})}
                        >
                          {TIMES.map(t => <option key={t} value={t}>{formatTime(t)}</option>)}
                        </select>
                      </div>
                      <button 
                        type="button"
                        onClick={addSlotToNewBatch}
                        className="bg-slate-200 text-slate-700 p-2 rounded-lg hover:bg-slate-300"
                      >
                        <Plus size={20} />
                      </button>
                   </div>
                </div>
             </div>
             
             <div className="p-6 border-t border-slate-100">
                <button 
                  onClick={handleCreateBatch}
                  className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg"
                >
                  Create Batch
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
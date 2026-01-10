import React, { useState } from 'react';
import { useData } from '../services/store';
import { Holiday } from '../types';
import { Calendar, Plus } from 'lucide-react';

export const Holidays: React.FC = () => {
  const { holidays, addHoliday } = useData();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Holiday>>({
    type: 'public'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.startDate) {
      await addHoliday({
        id: Date.now().toString(),
        name: formData.name,
        startDate: formData.startDate,
        endDate: formData.endDate || formData.startDate,
        type: formData.type || 'public'
      } as Holiday);
      setShowForm(false);
      setFormData({ type: 'public' });
    }
  };

  const sortedHolidays = [...holidays].sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5" /> Holiday Calendar
        </h3>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Add Holiday
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              placeholder="Holiday Name"
              className="p-2 border rounded"
              required
              value={formData.name || ''}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
            <select
              className="p-2 border rounded"
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value as any})}
            >
              <option value="public">Public Holiday</option>
              <option value="institute">Institute Break</option>
            </select>
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Start Date</label>
                <input
                  type="date"
                  className="w-full p-2 border rounded"
                  required
                  value={formData.startDate || ''}
                  onChange={e => setFormData({...formData, startDate: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">End Date</label>
                <input
                  type="date"
                  className="w-full p-2 border rounded"
                   value={formData.endDate || ''}
                  onChange={e => setFormData({...formData, endDate: e.target.value})}
                />
              </div>
            </div>
          </div>
          <div className="mt-2 flex justify-end gap-2">
             <button 
              type="button" 
              onClick={() => setShowForm(false)}
              className="px-3 py-1 text-sm border rounded hover:bg-white"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {sortedHolidays.map(h => (
          <div key={h.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
             <div className="flex items-center gap-3">
               <div className={`w-2 h-2 rounded-full ${h.type === 'public' ? 'bg-red-500' : 'bg-blue-500'}`} />
               <div>
                 <div className="font-medium">{h.name}</div>
                 <div className="text-xs text-gray-500">
                   {h.startDate} {h.startDate !== h.endDate && `to ${h.endDate}`}
                 </div>
               </div>
             </div>
             <span className="text-xs bg-gray-100 px-2 py-1 rounded capitalize text-gray-600">{h.type}</span>
          </div>
        ))}
        {holidays.length === 0 && <p className="text-gray-500 text-sm italic">No holidays added yet.</p>}
      </div>
    </div>
  );
};

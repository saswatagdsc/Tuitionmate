import React, { useState } from 'react';
import { useData } from '../services/store';
import { Enquiry } from '../types';
import { MessageSquare, Phone, User, CheckCircle, XCircle } from 'lucide-react';

export const CRM: React.FC = () => {
  const { enquiries, addEnquiry, updateEnquiryStatus } = useData();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Enquiry>>({
    status: 'new',
    notes: []
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = (formData.phone || '').replace(/\D/g, '');
    if (!formData.studentName || digits.length !== 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (formData.studentName && digits) {
      await addEnquiry({
        id: Date.now().toString(),
        studentName: formData.studentName,
        parentName: formData.parentName || '',
        phone: digits,
        class: formData.class || '',
        status: 'new',
        date: new Date().toISOString().split('T')[0],
        notes: [],
        ...formData
      } as Enquiry);
      setShowForm(false);
      setFormData({ status: 'new', notes: [] });
    }
  };

  const getStatusColor = (status: Enquiry['status']) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'demo_scheduled': return 'bg-purple-100 text-purple-800';
      case 'converted': return 'bg-green-100 text-green-800';
      case 'lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <User className="w-6 h-6" /> Growth Engine (CRM)
        </h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + New Enquiry
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold mb-4">Add Potential Student</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              placeholder="Student Name"
              className="p-2 border rounded"
              required
              value={formData.studentName || ''}
              onChange={e => setFormData({...formData, studentName: e.target.value})}
            />
            <input
              placeholder="Parent Name"
              className="p-2 border rounded"
              value={formData.parentName || ''}
              onChange={e => setFormData({...formData, parentName: e.target.value})}
            />
            <input
              placeholder="10-digit Mobile Number"
              className="p-2 border rounded"
              required
              value={formData.phone || ''}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, '');
                if (digits.length <= 10) {
                  setFormData({...formData, phone: digits});
                }
              }}
              maxLength={10}
            />
            <input
              placeholder="Class/Course Interest"
              className="p-2 border rounded"
              value={formData.class || ''}
              onChange={e => setFormData({...formData, class: e.target.value})}
            />
            <textarea
              placeholder="Initial Notes"
              className="p-2 border rounded md:col-span-2"
              onChange={e => setFormData({...formData, notes: [e.target.value]})}
            />
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
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save Enquiry
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interest</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {enquiries.map((enq) => (
                <tr key={enq.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{enq.studentName}</div>
                    <div className="text-sm text-gray-500">Parent: {enq.parentName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                       <Phone className="w-4 h-4 text-gray-400" /> {enq.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{enq.class}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(enq.status)}`}>
                      {enq.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <select 
                      value={enq.status}
                      onChange={(e) => updateEnquiryStatus(enq.id, e.target.value as Enquiry['status'])}
                      className="border rounded p-1"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="demo_scheduled">Demo</option>
                      <option value="converted">Convert</option>
                      <option value="lost">Lost</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {enquiries.length === 0 && (
            <div className="text-center py-6 text-gray-500">No enquiries found. Add your first lead!</div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useData } from '../services/store';
import { Expense } from '../types';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

export const Expenses: React.FC = () => {
  const { expenses, addExpense, fees } = useData();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Expense>>({
    category: 'other'
  });

  // Calculate totals
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalRevenue = fees
    .flatMap(f => f.payments || [])
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const profit = totalRevenue - totalExpenses;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title && formData.amount) {
      await addExpense({
        id: Date.now().toString(),
        title: formData.title,
        amount: Number(formData.amount),
        category: formData.category || 'other',
        date: new Date().toISOString().split('T')[0],
        ...formData
      } as Expense);
      setShowForm(false);
      setFormData({ category: 'other' });
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="w-6 h-6" /> Financial Health
        </h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          - Record Expense
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 text-green-700 mb-2">
            <TrendingUp className="w-5 h-5" /> Revenue
          </div>
          <div className="text-3xl font-bold text-green-800">₹{totalRevenue.toLocaleString()}</div>
        </div>
        <div className="bg-red-50 p-6 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <TrendingDown className="w-5 h-5" /> Expenses
          </div>
          <div className="text-3xl font-bold text-red-800">₹{totalExpenses.toLocaleString()}</div>
        </div>
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <DollarSign className="w-5 h-5" /> Net Profit
          </div>
          <div className={`text-3xl font-bold ${profit >= 0 ? 'text-blue-800' : 'text-red-800'}`}>
            ₹{profit.toLocaleString()}
          </div>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-6 border-l-4 border-red-500">
          <h3 className="text-lg font-semibold mb-4 text-red-700">Record New Expense</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              placeholder="Expense Title"
              className="p-2 border rounded"
              required
              value={formData.title || ''}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
            <input
              type="number"
              placeholder="Amount"
              className="p-2 border rounded"
              required
              value={formData.amount || ''}
              onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
            />
            <select
              className="p-2 border rounded"
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value as any})}
            >
              <option value="rent">Rent</option>
              <option value="salary">Salary</option>
              <option value="utilities">Utilities</option>
              <option value="marketing">Marketing</option>
              <option value="maintenance">Maintenance</option>
              <option value="other">Other</option>
            </select>
            <input
              type="date"
              className="p-2 border rounded"
              required
              defaultValue={new Date().toISOString().split('T')[0]}
              onChange={e => setFormData({...formData, date: e.target.value})}
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
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Save Expense
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses.map((exp) => (
              <tr key={exp.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.date}</td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{exp.title}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs bg-gray-100 rounded-full capitalize">{exp.category}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-red-600">
                  - ₹{exp.amount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

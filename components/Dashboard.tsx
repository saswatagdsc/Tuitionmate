import React, { useMemo } from 'react';
import { View } from '../App';
import { useData } from '../services/store';
import { 
  Users, 
  IndianRupee, 
  Calendar, 
  ArrowRight, 
  AlertCircle,
  Plus,
  CheckCircle2
} from 'lucide-react';

interface DashboardProps {
  onViewChange: (view: View) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onViewChange }) => {
  const { students, fees, attendance, batches } = useData();

  const totalStudents = students.length;
  const pendingFees = fees.filter(f => f.status === 'pending' || f.status === 'overdue').reduce((acc, curr) => acc + curr.amount, 0);
  const overdueCount = fees.filter(f => f.status === 'overdue').length;
  
  // Calculate today's classes based on batch schedules
  const today = new Date();
  const todayName = today.toLocaleDateString('en-US', { weekday: 'short' });
  const todayBatches = batches.filter(b => b.days?.includes(todayName));

  // Get recent activity from attendance and fee payments
  const recentActivity = useMemo(() => {
    const activities: Array<{ type: string; text: string; time: Date; key: string }> = [];
    
    // Recent attendance records
    attendance.slice(-5).forEach(a => {
      const batch = batches.find(b => b.id === a.batchId);
      const presentCount = a.records?.filter(r => r.status === 'present').length || 0;
      if (batch && a.date) {
        activities.push({
          type: 'attendance',
          text: `Attendance marked for ${batch.name} - ${presentCount} present`,
          time: new Date(a.date),
          key: `a-${a.id || a.date}`
        });
      }
    });
    
    // Recent fee payments
    fees.forEach(f => {
      f.payments?.slice(-3).forEach(p => {
        const student = students.find(s => s.id === f.studentId);
        if (student && p.date) {
          activities.push({
            type: 'payment',
            text: `₹${p.amount} received from ${student.name}`,
            time: new Date(p.date),
            key: `p-${p.id}`
          });
        }
      });
    });
    
    // Sort by time, most recent first
    return activities.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 5);
  }, [attendance, fees, batches, students]);

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-500">Welcome back, Sir. Here's what's happening today.</p>
        </div>
        <p className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
          {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Students</p>
              <h3 className="text-2xl font-bold text-slate-900">{totalStudents}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
              <IndianRupee size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Pending Fees</p>
              <h3 className="text-2xl font-bold text-slate-900">₹{pendingFees.toLocaleString()}</h3>
            </div>
          </div>
          {overdueCount > 0 && (
            <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle size={12} /> {overdueCount} payments overdue
            </p>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Today's Schedule</p>
              <h3 className="text-2xl font-bold text-slate-900">{todayBatches.length} Batch{todayBatches.length !== 1 ? 'es' : ''}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button 
            onClick={() => onViewChange('attendance')}
            className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 text-green-700 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors">
                <CheckCircle2 size={20} />
              </div>
              <span className="font-medium text-slate-700 group-hover:text-slate-900">Take Attendance</span>
            </div>
            <ArrowRight size={16} className="text-slate-400 group-hover:text-slate-600" />
          </button>

          <button 
            onClick={() => onViewChange('students')}
            className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Plus size={20} />
              </div>
              <span className="font-medium text-slate-700 group-hover:text-slate-900">Add New Student</span>
            </div>
            <ArrowRight size={16} className="text-slate-400 group-hover:text-slate-600" />
          </button>

          <button 
            onClick={() => onViewChange('fees')}
            className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 text-orange-700 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-colors">
                <IndianRupee size={20} />
              </div>
              <span className="font-medium text-slate-700 group-hover:text-slate-900">Log Payment</span>
            </div>
            <ArrowRight size={16} className="text-slate-400 group-hover:text-slate-600" />
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Recent Activity</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity) => (
              <div key={activity.key} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${activity.type === 'payment' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                  <p className="text-sm text-slate-600">{activity.text}</p>
                </div>
                <span className="text-xs text-slate-400">{getTimeAgo(activity.time)}</span>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-slate-400">
              <p>No recent activity. Start by adding students and marking attendance!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

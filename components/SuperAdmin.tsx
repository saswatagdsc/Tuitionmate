import React, { useState, useEffect } from 'react';
import { 
  Users, School, BookOpen, DollarSign, Activity, 
  Search, Filter, Download, Trash2, Mail, ShieldAlert,
  BarChart3, PieChart, GraduationCap, Lock, Unlock, AlertTriangle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell
} from 'recharts';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

interface AdminStats {
  totalTeachers: number;
  totalStudents: number;
  totalBatches: number;
  activeSubscriptions: number;
  systemHealth: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  studentCount: number;
  batchCount: number;
  joinedDate: string;
  lastLogin?: string;
  isFrozen?: boolean;
}

export const SuperAdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats>({
    totalTeachers: 0,
    totalStudents: 0,
    totalBatches: 0,
    activeSubscriptions: 0,
    systemHealth: 'Healthy'
  });
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'overview' | 'teachers' | 'settings'>('overview');
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [newTeacher, setNewTeacher] = useState({ name: '', email: '' });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admin/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeacher)
      });
      if (res.ok) {
        alert('Teacher added & invite sent!');
        setIsAddTeacherOpen(false);
        setNewTeacher({ name: '', email: '' });
        fetchAdminData();
      } else {
        const err = await res.json();
        alert('Error: ' + err.error);
      }
    } catch (e) {
      alert('Failed to connect');
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`${API_BASE}/admin/teachers/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setTeachers(prev => prev.filter(t => t.id !== id));
        setConfirmDelete(null);
      } else {
        const err = await res.json();
        alert('Error: ' + err.error);
      }
    } catch (e) {
      alert('Failed to connect');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleFreeze = async (id: string, currentlyFrozen: boolean) => {
    setActionLoading(id);
    try {
      const res = await fetch(`${API_BASE}/admin/teachers/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFrozen: !currentlyFrozen })
      });
      if (res.ok) {
        setTeachers(prev => prev.map(t => 
          t.id === id ? { ...t, isFrozen: !currentlyFrozen } : t
        ));
      } else {
        const err = await res.json();
        alert('Error: ' + err.error);
      }
    } catch (e) {
      alert('Failed to connect');
    } finally {
      setActionLoading(null);
    }
  };

  const fetchAdminData = async () => {
    try {
      setIsLoading(true);
      // In a real app, these would be dedicated admin endpoints
      // For now, we'll simulate fetching all data or add an admin endpoint later
      const res = await fetch(`${API_BASE}/admin/dashboard`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setTeachers(data.teachers);
      }
    } catch (e) {
      console.error("Failed to fetch admin data", e);
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white p-4 flex flex-col">
        <div className="mb-8 px-2 flex items-center gap-3">
          <ShieldAlert className="text-blue-400" />
          <span className="font-bold text-lg">Super Admin</span>
        </div>
        
        <nav className="space-y-2 flex-1">
          <button 
            onClick={() => setView('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'overview' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Activity size={20} /> Overview
          </button>
          <button 
            onClick={() => setView('teachers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'teachers' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Users size={20} /> Teachers
          </button>
          <button 
            onClick={() => setView('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Filter size={20} /> System Logs
          </button>
        </nav>

        <div className="border-t border-slate-800 pt-4 mt-auto">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center font-bold">A</div>
            <div>
              <p className="text-sm font-medium">Administrator</p>
              <p className="text-xs text-slate-400">Super Access</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <h1 className="text-xl font-bold text-slate-800">
            {view === 'overview' ? 'System Overview' : view.charAt(0).toUpperCase() + view.slice(1)}
          </h1>
          <div className="flex gap-4">
             {view === 'teachers' && (
                <button onClick={() => setIsAddTeacherOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm">
                   <Users size={16} /> Add Teacher
                </button>
             )}
            <button onClick={fetchAdminData} className="text-sm text-blue-600 hover:underline">
              Refresh Data
            </button>
          </div>
        </header>

        <main className="p-8">
          {isAddTeacherOpen && (
            <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="text-lg font-bold mb-4">Invite New Teacher</h3>
                <form onSubmit={handleAddTeacher} className="space-y-4">
                   <input required type="text" placeholder="Teacher Name" className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:border-blue-500"
                     value={newTeacher.name} onChange={e => setNewTeacher({...newTeacher, name: e.target.value})} />
                   <input required type="email" placeholder="Teacher Email" className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:border-blue-500"
                     value={newTeacher.email} onChange={e => setNewTeacher({...newTeacher, email: e.target.value})} />
                   <div className="flex gap-3 pt-2">
                     <button type="button" onClick={() => setIsAddTeacherOpen(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-600 hover:bg-slate-200">Cancel</button>
                     <button type="submit" className="flex-1 py-3 bg-blue-600 rounded-xl font-bold text-white hover:bg-blue-700 shadow-lg">Send Invite</button>
                   </div>
                </form>
              </div>
            </div>
          )}
          {view === 'overview' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Teachers" value={stats.totalTeachers} icon={Users} color="bg-blue-500" />
                <StatCard title="Total Students" value={stats.totalStudents} icon={GraduationCap} color="bg-green-500" />
                <StatCard title="Batches Running" value={stats.totalBatches} icon={BookOpen} color="bg-purple-500" />
                <StatCard title="System Status" value={stats.systemHealth} icon={Activity} color="bg-orange-500" />
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-800 mb-4">Growth Metrics</h3>
                  <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                    Chart Placeholder (Requires History Data)
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                   <h3 className="font-bold text-slate-800 mb-4">Recent Activity</h3>
                   <div className="space-y-4">
                      {[1,2,3].map(i => (
                        <div key={i} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <p className="text-sm text-slate-600">New teacher registered</p>
                            <span className="text-xs text-slate-400 ml-auto">2h ago</span>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            </div>
          )}

          {view === 'teachers' && (
             <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                    <input type="text" placeholder="Search teachers..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4">Teacher Name</th>
                      <th className="px-6 py-4">Students</th>
                      <th className="px-6 py-4">Batches</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Joined</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teachers.map(teacher => (
                      <tr key={teacher.id} className={`hover:bg-slate-50 transition-colors ${teacher.isFrozen ? 'bg-red-50' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${teacher.isFrozen ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                              {teacher.name.charAt(0)}
                            </div>
                            <div>
                                <div className="font-medium text-slate-900">{teacher.name}</div>
                                <div className="text-xs text-slate-400">{teacher.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">{teacher.studentCount}</td>
                        <td className="px-6 py-4">{teacher.batchCount}</td>
                        <td className="px-6 py-4">
                          {teacher.isFrozen ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                              <Lock size={12} /> Frozen
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              <Unlock size={12} /> Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">{new Date(teacher.joinedDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleToggleFreeze(teacher.id, !!teacher.isFrozen)}
                              disabled={actionLoading === teacher.id}
                              className={`p-2 rounded-lg transition-colors ${teacher.isFrozen ? 'text-green-600 hover:bg-green-50' : 'text-orange-500 hover:bg-orange-50'}`}
                              title={teacher.isFrozen ? 'Unfreeze Account' : 'Freeze Account'}
                            >
                              {actionLoading === teacher.id ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : teacher.isFrozen ? (
                                <Unlock size={18} />
                              ) : (
                                <Lock size={18} />
                              )}
                            </button>
                            <button 
                              onClick={() => setConfirmDelete(teacher.id)}
                              disabled={actionLoading === teacher.id}
                              className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors" 
                              title="Delete Teacher"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          )}

          {/* Delete Confirmation Modal */}
          {confirmDelete && (
            <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4 text-red-600">
                  <AlertTriangle size={24} />
                  <h3 className="text-lg font-bold">Delete Teacher?</h3>
                </div>
                <p className="text-slate-600 mb-2">
                  This action is <strong>irreversible</strong>. Deleting this teacher will permanently remove:
                </p>
                <ul className="text-sm text-slate-500 mb-4 list-disc pl-6 space-y-1">
                  <li>All students of this teacher</li>
                  <li>All batches and attendance records</li>
                  <li>All fee records and payments</li>
                  <li>All exam results, messages, and notices</li>
                  <li>All enquiries, expenses, and materials</li>
                </ul>
                <p className="text-sm text-slate-500 mb-4">
                  Consider <strong>freezing</strong> the account instead if you want to revoke access temporarily.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setConfirmDelete(null)} 
                    className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-600 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => confirmDelete && handleDeleteTeacher(confirmDelete)}
                    disabled={actionLoading === confirmDelete}
                    className="flex-1 py-3 bg-red-600 rounded-xl font-bold text-white hover:bg-red-700 shadow-lg flex items-center justify-center gap-2"
                  >
                    {actionLoading === confirmDelete ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Trash2 size={18} /> Delete Permanently
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

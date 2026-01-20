import React from 'react';
import { View } from '../App';
import { useData } from '../services/store';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  IndianRupee, 
  GraduationCap, 
  Sparkles,
  MessageCircle,
  Bell,
  CalendarDays,
  UserPlus,
  BookOpen,
  PieChart,
  Settings,
  X,
  Bot
} from 'lucide-react';

interface MenuProps {
  onClose: () => void;
  onNavigate: (view: View) => void;
  currentView: View;
}

export const Menu: React.FC<MenuProps> = ({ onClose, onNavigate, currentView }) => {
  const { currentUser } = useData();

  const teacherFeatures = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={32} />, color: 'bg-blue-50 text-blue-600' },
    { id: 'teacher-agent', label: 'Teacher Agent', icon: <Bot size={32} />, color: 'bg-indigo-50 text-indigo-700' },
    { id: 'crm', label: 'Growth Engine', icon: <UserPlus size={32} />, color: 'bg-purple-50 text-purple-600' },
    { id: 'students', label: 'Students', icon: <Users size={32} />, color: 'bg-green-50 text-green-600' },
    { id: 'batches', label: 'Batches', icon: <Users size={32} />, color: 'bg-teal-50 text-teal-600' }, 
    { id: 'attendance', label: 'Attendance', icon: <CalendarCheck size={32} />, color: 'bg-orange-50 text-orange-600' },
    { id: 'materials', label: 'Study Materials', icon: <BookOpen size={32} />, color: 'bg-indigo-50 text-indigo-600' },
    { id: 'expenses', label: 'Finance', icon: <PieChart size={32} />, color: 'bg-red-50 text-red-600' },
    { id: 'fees', label: 'Fees', icon: <IndianRupee size={32} />, color: 'bg-yellow-50 text-yellow-600' },
    { id: 'academics', label: 'Academics', icon: <GraduationCap size={32} />, color: 'bg-emerald-50 text-emerald-600' },
    { id: 'notices', label: 'Notices', icon: <Bell size={32} />, color: 'bg-teal-50 text-teal-600' },
    { id: 'chat', label: 'Chat', icon: <MessageCircle size={32} />, color: 'bg-cyan-50 text-cyan-600' },
    { id: 'schedule', label: 'Schedule', icon: <CalendarDays size={32} />, color: 'bg-pink-50 text-pink-600' },
    { id: 'ai-tools', label: 'AI Tools', icon: <Sparkles size={32} />, color: 'bg-violet-50 text-violet-600' },
    { id: 'ai-grading', label: 'AI Grading', icon: <BookOpen size={32} />, color: 'bg-yellow-50 text-yellow-700' },
    { id: 'settings', label: 'Settings', icon: <Settings size={32} />, color: 'bg-gray-50 text-gray-600' },
  ];

  const studentFeatures = [
    { id: 'dashboard', label: 'My Portal', icon: <LayoutDashboard size={32} />, color: 'bg-blue-50 text-blue-600' },
    { id: 'materials', label: 'Study Materials', icon: <BookOpen size={32} />, color: 'bg-indigo-50 text-indigo-600' },
    { id: 'chat', label: 'Class Chat', icon: <MessageCircle size={32} />, color: 'bg-cyan-50 text-cyan-600' },
    { id: 'notices', label: 'Notices', icon: <Bell size={32} />, color: 'bg-teal-50 text-teal-600' },
    { id: 'fees', label: 'My Fees', icon: <IndianRupee size={32} />, color: 'bg-yellow-50 text-yellow-600' },
    { id: 'academics', label: 'Results', icon: <GraduationCap size={32} />, color: 'bg-green-50 text-green-600' },
  ];

  const features = currentUser?.role === 'student' ? studentFeatures : teacherFeatures;

  const handleNavigate = (viewId: string) => {
    onNavigate(viewId as View);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">All Features</h2>
        <button 
          onClick={onClose}
          className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-red-500"
        >
          <X size={24} />
        </button>
      </div>

      {/* Feature Grid */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="grid grid-cols-3 gap-4">
          {features.map((feature) => (
            <button
              key={feature.id}
              onClick={() => handleNavigate(feature.id)}
              className={`flex flex-col items-center justify-center p-4 rounded-xl shadow-sm border transition-all active:scale-95 ${
                currentView === feature.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-slate-200 bg-white'
              } ${feature.color}`}
            >
              <div className="mb-2">
                {feature.icon}
              </div>
              <span className="text-xs font-medium text-center leading-tight">
                {feature.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

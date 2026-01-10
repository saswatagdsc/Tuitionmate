import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { Students } from './components/Students';
import { Batches } from './components/Batches';
import { Attendance } from './components/Attendance';
import { Fees } from './components/Fees';
import { Academics } from './components/Academics';
import { AiTools } from './components/AiTools';
import { Login } from './components/Login';
import { Chat } from './components/Chat';
import { Notices } from './components/Notices';
import { Schedule } from './components/Schedule';
import { DataProvider, useData } from './services/store';

import { CRM } from './components/CRM';
import { Expenses } from './components/Expenses';
import { StudyMaterials } from './components/StudyMaterials';
import { Settings } from './components/Settings';
import { SuperAdminDashboard } from './components/SuperAdmin';

export type View = 'dashboard' | 'students' | 'batches' | 'attendance' | 'fees' | 'academics' | 'ai-tools' | 'chat' | 'notices' | 'schedule' | 'crm' | 'expenses' | 'materials' | 'settings';

const MainApp: React.FC = () => {
  const { currentUser } = useData();
  const [currentView, setCurrentView] = useState<View>('dashboard');

  if (!currentUser) {
    return <Login />;
  }

  if (currentUser.role === 'superadmin' || (currentUser as any).role === 'admin') {
      return <SuperAdminDashboard />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return currentUser.role === 'student' ? <StudentDashboard /> : <Dashboard onViewChange={setCurrentView} />;
      case 'students':
        return <Students />;
      case 'batches':
        return <Batches />;
      case 'attendance':
        return <Attendance />;
      case 'fees':
        return <Fees />;
      case 'academics':
        return <Academics />;
      case 'ai-tools':
        return <AiTools />;
      case 'chat':
        return <Chat />;
      case 'notices':
        return <Notices />;
      case 'schedule':
        return <Schedule />;
      case 'crm':
        return <CRM />;
      case 'expenses':
        return <Expenses />;
      case 'materials':
        return <StudyMaterials />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onViewChange={setCurrentView} />;
    }
  };

  return (
    <Layout currentView={currentView} onViewChange={setCurrentView}>
      {renderView()}
    </Layout>
  );
};

export default function App() {
  return (
    <DataProvider>
      <MainApp />
    </DataProvider>
  );
}
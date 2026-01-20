import React, { useState, useEffect } from 'react';
import { useData } from '../services/store';
import { Plus, Bot, CheckCircle, AlertTriangle, TrendingUp, Calendar, Mail, Loader2, ArrowRight } from 'lucide-react';

interface WeeklyPlan {
  weekNumber: number;
  startDate: string;
  endDate: string;
  objectives: string;
  teachingFlow: string;
  assignments: string;
  assessmentPlan: string;
  revisionStrategy: string;
  emailContent: string;
  riskAnalysis?: string;
  status: string;
}

interface AgentPlan {
  id: string;
  teacherId: string;
  classGrade: string;
  subject: string;
  board: string;
  syllabus: string;
  startDate: string;
  examDate?: string;
  teachingFrequency?: string;
  sessionDuration?: string;
  currentSyllabusCompletion?: number;
  currentRiskLevel?: 'Low' | 'Medium' | 'High';
  weeklyPlans: WeeklyPlan[];
  status: string;
}

export const TeacherAgent: React.FC = () => {
  const { currentUser } = useData();
  const [plans, setPlans] = useState<AgentPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<AgentPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    classGrade: '',
    subject: '',
    board: '',
    syllabus: '',
    startDate: new Date().toISOString().split('T')[0],
    examDate: '',
    teachingFrequency: '3 classes/week',
    sessionDuration: '60 mins'
  });

  // Force usage of the production API URL as requested
  const apiUrl = 'https://api.mondalsirmaths.in/api';

  useEffect(() => {
    fetchPlans();
  }, [currentUser]);

  const fetchPlans = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/agent/plans?teacherId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
        // If we have a selected plan, refresh it from the new data
        if (selectedPlan) {
          const updated = data.find((p: AgentPlan) => p.id === selectedPlan.id);
          if (updated) setSelectedPlan(updated);
        }
      }
    } catch (error) {
      console.error("Failed to fetch plans", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async () => {
    if (!currentUser) return;
    const newId = Math.random().toString(36).substr(2, 9);
    const payload = {
      id: newId,
      teacherId: currentUser.id,
      ...formData,
      status: 'active',
      weeklyPlans: []
    };

    try {
      const res = await fetch(`${apiUrl}/agent/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const created = await res.json();
        setPlans([...plans, created]);
        setShowForm(false);
        setFormData({ 
          classGrade: '', subject: '', board: '', syllabus: '', startDate: '', 
          examDate: '', teachingFrequency: '3 classes/week', sessionDuration: '60 mins' 
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const generateWeekPlan = async (plan: AgentPlan, weekNum: number) => {
    setGenerating(true);
    try {
      const res = await fetch(`${apiUrl}/agent/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          weekNumber: weekNum,
          context: {
            classGrade: plan.classGrade,
            subject: plan.subject,
            board: plan.board,
            syllabus: plan.syllabus,
            startDate: plan.startDate,
            examDate: plan.examDate,
            teachingFrequency: plan.teachingFrequency,
            sessionDuration: plan.sessionDuration,
            previousProgress: plan.weeklyPlans.map(w => `Week ${w.weekNumber}: ${w.objectives}`).join('; ')
          }
        })
      });
      if (res.ok) {
        // Refresh plans
        await fetchPlans();
      } else {
        const err = await res.json();
        alert("Failed to generate plan: " + (err.error || "Unknown error"));
      }
    } catch (e) {
      console.error(e);
      alert("Error connecting to server");
    } finally {
      setGenerating(false);
    }
  };

  const getRiskColor = (level?: string) => {
    switch(level) {
      case 'High': return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-2xl font-bold flex items-center gap-2">
             <Bot className="w-8 h-8 text-indigo-600" />
             Autonomous Teacher Agent
           </h1>
           <p className="text-gray-500">Manage multiple classes with AI-driven planning</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700"
        >
          <Plus size={20} />
          New Class Agent
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-indigo-100">
          <h3 className="font-semibold mb-4">Configure New Class Agent</h3>
          <div className="grid grid-cols-2 gap-4">
            <input 
              placeholder="Class / Grade (e.g. Class 10)" 
              className="border p-2 rounded"
              value={formData.classGrade}
              onChange={e => setFormData({...formData, classGrade: e.target.value})}
            />
            <input 
              placeholder="Subject (e.g. Mathematics)" 
              className="border p-2 rounded"
              value={formData.subject}
              onChange={e => setFormData({...formData, subject: e.target.value})}
            />
            <input 
              placeholder="Board / Curriculum (e.g. CBSE)" 
              className="border p-2 rounded"
              value={formData.board}
              onChange={e => setFormData({...formData, board: e.target.value})}
            />
            <input 
              type="date"
              className="border p-2 rounded"
              title="Start Date"
              value={formData.startDate}
              onChange={e => setFormData({...formData, startDate: e.target.value})}
            />
            <div className="flex gap-2">
               <input 
                 placeholder="Duration (e.g. 60 mins)" 
                 className="border p-2 rounded w-1/2"
                 value={formData.sessionDuration}
                 onChange={e => setFormData({...formData, sessionDuration: e.target.value})}
               />
               <input 
                 placeholder="Frequency (e.g. 3/week)" 
                 className="border p-2 rounded w-1/2"
                 value={formData.teachingFrequency}
                 onChange={e => setFormData({...formData, teachingFrequency: e.target.value})}
               />
            </div>
            <div className="col-span-2">
               <label className="block text-xs font-semibold text-gray-500 mb-1">Target Exam Date (Optional)</label>
               <input 
                 type="date"
                 className="border p-2 rounded w-full"
                 value={formData.examDate}
                 onChange={e => setFormData({...formData, examDate: e.target.value})}
               />
            </div>
            <textarea 
              placeholder="Syllabus Overview / Topics" 
              className="border p-2 rounded col-span-2 h-24"
              value={formData.syllabus}
              onChange={e => setFormData({...formData, syllabus: e.target.value})}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="text-gray-500 px-4 py-2">Cancel</button>
            <button onClick={handleCreateAgent} className="bg-indigo-600 text-white px-4 py-2 rounded">Create Agent</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar: List of Agents */}
        <div className="md:col-span-1 space-y-4">
          {plans.map(plan => (
            <div 
              key={plan.id}
              onClick={() => setSelectedPlan(plan)}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selectedPlan?.id === plan.id 
                  ? 'bg-indigo-50 border-indigo-500 shadow-md transform scale-105' 
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg">{plan.classGrade}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${getRiskColor(plan.currentRiskLevel)}`}>
                  {plan.currentRiskLevel || 'Low'} Risk
                </span>
              </div>
              <p className="font-semibold text-indigo-700">{plan.subject}</p>
              <p className="text-xs text-gray-500 mt-1">{plan.board} • {plan.weeklyPlans.length} Weeks Planned</p>
              
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Syllabus</span>
                  <span>{plan.currentSyllabusCompletion || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-green-500 h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${plan.currentSyllabusCompletion || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
          {plans.length === 0 && !loading && (
            <div className="text-center text-gray-400 py-10">
              <Bot size={48} className="mx-auto mb-2 opacity-20" />
              <p>No classes configured</p>
            </div>
          )}
        </div>

        {/* Main Content: Selected Agent Details */}
        <div className="md:col-span-3">
          {selectedPlan ? (
            <div className="bg-white rounded-lg shadow-lg border border-gray-100 min-h-[600px] flex flex-col">
              {/* Agent Header Stats */}
              <div className="bg-white p-6 border-b rounded-t-lg">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{selectedPlan.classGrade} - {selectedPlan.subject}</h2>
                    <p className="text-gray-500 text-sm mt-1">{selectedPlan.board} • Started on {selectedPlan.startDate}</p>
                  </div>
                  <button 
                    onClick={() => generateWeekPlan(selectedPlan, (selectedPlan.weeklyPlans.length || 0) + 1)}
                    disabled={generating}
                    className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 shadow-sm transition-all hover:shadow hover:-translate-y-0.5"
                  >
                    {generating ? <Loader2 className="animate-spin" size={20} /> : <Bot size={20} />}
                    Plan Week {(selectedPlan.weeklyPlans.length || 0) + 1}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Total Progress</p>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold text-blue-900">{selectedPlan.currentSyllabusCompletion || 0}%</span>
                      <TrendingUp size={20} className="text-blue-500 mb-1" />
                    </div>
                  </div>
                  
                  <div className={`p-4 rounded-xl border ${getRiskColor(selectedPlan.currentRiskLevel)}`}>
                     <p className="text-xs font-semibold uppercase mb-1 opacity-75">Academic Risk</p>
                     <div className="flex items-end gap-2">
                       <span className="text-2xl font-bold">{selectedPlan.currentRiskLevel || 'Low'}</span>
                       <AlertTriangle size={20} className="mb-1 opacity-75" />
                     </div>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <p className="text-xs font-semibold text-purple-600 uppercase mb-1">Current Status</p>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold text-purple-900">Week {selectedPlan.weeklyPlans.length}</span>
                      <Calendar size={20} className="text-purple-500 mb-1" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Weekly Plans Content */}
              <div className="p-6 bg-gray-50 flex-1 overflow-y-auto">
                {selectedPlan.weeklyPlans.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                     <Bot size={64} className="mb-4 text-gray-300" />
                     <p className="text-lg">No weekly plans yet.</p>
                     <p className="text-sm">Click "Plan Week 1" to let the AI take over.</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {[...selectedPlan.weeklyPlans].reverse().map((week, idx) => (
                      <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {/* Week Header */}
                        <div className="bg-indigo-900 text-white p-4 flex justify-between items-center">
                          <h4 className="font-bold text-lg flex items-center gap-2">
                            Week {week.weekNumber} 
                            <span className="text-xs font-normal opacity-75 bg-indigo-800 px-2 py-0.5 rounded">
                              {week.startDate} - {week.endDate}
                            </span>
                          </h4>
                          {week.riskAnalysis && (
                             <span className="text-xs bg-orange-500 text-white px-3 py-1 rounded-full font-medium">
                               Risk Check: {week.riskAnalysis}
                             </span>
                          )}
                        </div>

                        <div className="p-5">
                          {/* Objectives & Flow */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="md:col-span-1">
                              <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Weekly Objectives</h5>
                              <div className="text-sm text-gray-900 leading-relaxed bg-gray-50 p-3 rounded-lg border">
                                {(() => {
                                  try {
                                    const val = week.objectives;
                                    if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))){
                                      const parsed = JSON.parse(val);
                                      if (Array.isArray(parsed)) return (
                                        <ul className="list-disc pl-5">
                                          {parsed.map((item, idx) => <li key={idx}>{item}</li>)}
                                        </ul>
                                      );
                                      if (typeof parsed === 'object') return <pre>{JSON.stringify(parsed, null, 2)}</pre>;
                                    }
                                    return val;
                                  } catch { return week.objectives; }
                                })()}
                              </div>
                              <h5 className="text-xs font-bold text-gray-500 uppercase mt-4 mb-2">Revision Goal</h5>
                              <div className="text-sm text-gray-700 bg-orange-50 p-3 rounded-lg border border-orange-100">
                                {(() => {
                                  try {
                                    const val = week.revisionStrategy;
                                    if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))){
                                      const parsed = JSON.parse(val);
                                      if (Array.isArray(parsed)) return (
                                        <ul className="list-disc pl-5">
                                          {parsed.map((item, idx) => <li key={idx}>{item}</li>)}
                                        </ul>
                                      );
                                      if (typeof parsed === 'object') return <pre>{JSON.stringify(parsed, null, 2)}</pre>;
                                    }
                                    return val;
                                  } catch { return week.revisionStrategy; }
                                })()}
                              </div>
                            </div>

                            <div className="md:col-span-2">
                               <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Teaching Flow</h5>
                               <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm whitespace-pre-wrap leading-relaxed font-mono text-gray-700">
                                 {(() => {
                                   try {
                                     const val = week.teachingFlow;
                                     if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))){
                                       const parsed = JSON.parse(val);
                                       if (Array.isArray(parsed)) {
                                         // Render as a table if array of objects with sessionNumber/date/topic
                                         if (parsed.length > 0 && typeof parsed[0] === 'object') {
                                           return (
                                             <table className="min-w-full text-xs border border-gray-300 rounded overflow-hidden">
                                               <thead className="bg-gray-200">
                                                 <tr>
                                                   {Object.keys(parsed[0]).map((key) => (
                                                     <th key={key} className="px-2 py-1 border-b border-gray-300 text-left">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</th>
                                                   ))}
                                                 </tr>
                                               </thead>
                                               <tbody>
                                                 {parsed.map((row, idx) => (
                                                   <tr key={idx} className="even:bg-gray-100">
                                                     {Object.values(row).map((cell, cidx) => (
                                                       <td key={cidx} className="px-2 py-1 border-b border-gray-200 align-top">
                                                         {Array.isArray(cell)
                                                           ? <ul className="list-disc pl-4">{cell.map((v, i) => <li key={i}>{v}</li>)}</ul>
                                                           : typeof cell === 'object'
                                                             ? <pre>{JSON.stringify(cell, null, 2)}</pre>
                                                             : cell}
                                                       </td>
                                                     ))}
                                                   </tr>
                                                 ))}
                                               </tbody>
                                             </table>
                                           );
                                         }
                                         // Otherwise, render as list
                                         return (
                                           <ul className="list-decimal pl-5">
                                             {parsed.map((item, idx) => <li key={idx}>{typeof item === 'string' ? item : JSON.stringify(item, null, 2)}</li>)}
                                           </ul>
                                         );
                                       }
                                       if (typeof parsed === 'object') return <pre>{JSON.stringify(parsed, null, 2)}</pre>;
                                     }
                                     return val;
                                   } catch { return week.teachingFlow; }
                                 })()}
                               </div>
                            </div>
                          </div>

                          {/* Assignments & Assessments */}
                          <div className="flex gap-4 mb-6">
                             <div className="flex-1 bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <h5 className="text-xs font-bold text-blue-700 uppercase mb-2 flex items-center gap-2">
                                  <CheckCircle size={14} /> Assignments
                                </h5>
                                <div className="text-sm text-blue-900">
                                  {(() => {
                                    try {
                                      const val = week.assignments;
                                      if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))){
                                        const parsed = JSON.parse(val);
                                        if (Array.isArray(parsed)) {
                                          // Render as card list if array of objects
                                          if (parsed.length > 0 && typeof parsed[0] === 'object') {
                                            return (
                                              <div className="flex flex-col gap-2">
                                                {parsed.map((item, idx) => (
                                                  <div key={idx} className="bg-blue-100 rounded p-2 border border-blue-200">
                                                    {Object.entries(item).map(([k, v]) => (
                                                      <div key={k}><span className="font-semibold capitalize">{k}:</span> {Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v, null, 2) : v}</div>
                                                    ))}
                                                  </div>
                                                ))}
                                              </div>
                                            );
                                          }
                                          // Otherwise, render as list
                                          return (
                                            <ul className="list-disc pl-5">
                                              {parsed.map((item, idx) => <li key={idx}>{typeof item === 'string' ? item : JSON.stringify(item, null, 2)}</li>)}
                                            </ul>
                                          );
                                        }
                                        if (typeof parsed === 'object') return <pre>{JSON.stringify(parsed, null, 2)}</pre>;
                                      }
                                      return val;
                                    } catch { return week.assignments; }
                                  })()}
                                </div>
                             </div>
                             <div className="flex-1 bg-purple-50 p-4 rounded-xl border border-purple-100">
                                <h5 className="text-xs font-bold text-purple-700 uppercase mb-2 flex items-center gap-2">
                                  <AlertTriangle size={14} /> Assessment
                                </h5>
                                <div className="text-sm text-purple-900">
                                  {(() => {
                                    try {
                                      const val = week.assessmentPlan;
                                      if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))){
                                        const parsed = JSON.parse(val);
                                        if (Array.isArray(parsed)) {
                                          // Render as card list if array of objects
                                          if (parsed.length > 0 && typeof parsed[0] === 'object') {
                                            return (
                                              <div className="flex flex-col gap-2">
                                                {parsed.map((item, idx) => (
                                                  <div key={idx} className="bg-purple-100 rounded p-2 border border-purple-200">
                                                    {Object.entries(item).map(([k, v]) => (
                                                      <div key={k}><span className="font-semibold capitalize">{k}:</span> {Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v, null, 2) : v}</div>
                                                    ))}
                                                  </div>
                                                ))}
                                              </div>
                                            );
                                          }
                                          // Otherwise, render as list
                                          return (
                                            <ul className="list-disc pl-5">
                                              {parsed.map((item, idx) => <li key={idx}>{typeof item === 'string' ? item : JSON.stringify(item, null, 2)}</li>)}
                                            </ul>
                                          );
                                        }
                                        if (typeof parsed === 'object') return <pre>{JSON.stringify(parsed, null, 2)}</pre>;
                                      }
                                      return val;
                                    } catch { return week.assessmentPlan; }
                                  })()}
                                </div>
                             </div>
                          </div>
                      
                          {/* Email Action */}
                          <div>
                            <details className="group">
                              <summary className="cursor-pointer list-none">
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 p-3 rounded-lg transition-colors">
                                  <Mail size={18} />
                                  <span>Preview Automated Weekly Email</span>
                                  <ArrowRight size={16} className="ml-auto transition-transform group-open:rotate-90" />
                                </div>
                              </summary>
                              <div className="mt-3 p-6 bg-white border-2 border-dashed border-gray-300 rounded-lg text-sm font-mono text-gray-700 whitespace-pre-wrap shadow-inner relative">
                                <div className="absolute top-2 right-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Draft Mode</div>
                                {week.emailContent}
                              </div>
                            </details>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow min-h-[500px] flex flex-col items-center justify-center text-center p-12 text-gray-400">
              <Bot size={64} className="mb-6 text-indigo-100" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Welcome to the Teacher Agent</h3>
              <p className="max-w-md mx-auto">Select a class from the list or create a new one to start autonomous planning, tracking, and communication.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

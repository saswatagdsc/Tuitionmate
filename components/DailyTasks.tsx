import React, { useEffect, useState } from 'react';
import { useData } from '../services/store';

export const DailyTasks: React.FC = () => {
  const { currentUser } = useData();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [today] = useState(() => new Date().toISOString().split('T')[0]);
  const [feedback, setFeedback] = useState({});
  const [successMsg, setSuccessMsg] = useState('');

  const fetchTasks = async () => {
    if (!currentUser) return;
    setLoading(true);
    const res = await fetch(
      `https://api.mondalsirmaths.in/api/teacher/daily-tasks?teacherId=${currentUser.id}&date=${today}`
    );
    const data = await res.json();
    setTasks(data);
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [currentUser, today]);

  const handleTick = async (task, completed) => {
    await fetch('https://api.mondalsirmaths.in/api/teacher/daily-tasks/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId: currentUser.id,
        date: today,
        topic: task.topic,
        sessionNumber: task.sessionNumber,
        completed,
        classGrade: task.classGrade,
        subject: task.subject,
        feedback: feedback[task._id] || '',
        feedbackType: task.feedbackType || 'none',
      })
    });
    setSuccessMsg('Task updated!');
    setTimeout(() => setSuccessMsg(''), 1200);
    fetchTasks();
  };

  const handleFeedback = (taskId, value) => {
    setFeedback(f => ({ ...f, [taskId]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span>Today's Tasks</span>
        {loading && <span className="ml-2 animate-spin text-blue-500">⏳</span>}
      </h2>
      {successMsg && <div className="mb-2 text-green-600 bg-green-50 border border-green-200 rounded px-3 py-1 text-sm">{successMsg}</div>}
      {!loading && tasks.length === 0 && (
        <div className="flex flex-col items-center text-gray-500 py-12">
          <span className="text-4xl mb-2">🎉</span>
          <span>No tasks assigned for today. Enjoy your day!</span>
        </div>
      )}
      <div className="space-y-4">
        {!loading && tasks.map(task => (
          <div
            key={task._id}
            className={`bg-white rounded-lg border p-4 flex flex-col gap-2 shadow-sm transition-all ${task.completed ? 'opacity-70 border-green-400 ring-2 ring-green-200' : ''}`}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={e => handleTick(task, e.target.checked)}
                className="accent-green-500 w-5 h-5"
              />
              <div>
                <div className={`font-semibold ${task.completed ? 'line-through text-green-700' : ''}`}>{task.topic}</div>
                <div className="text-xs text-gray-500">Session {task.sessionNumber} | {task.classGrade} {task.subject}</div>
              </div>
            </div>
            <textarea
              className="w-full border rounded p-2 text-sm mt-2 focus:ring-2 focus:ring-blue-200"
              placeholder="Feedback (e.g. too fast, students absent, planner wrong, etc.)"
              value={feedback[task._id] || task.feedback || ''}
              onChange={e => handleFeedback(task._id, e.target.value)}
              onBlur={e => handleTick(task, task.completed)}
              disabled={task.completed}
            />
            {task.completed && <div className="text-xs text-green-600 mt-1">Marked as completed</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

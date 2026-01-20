import React, { useEffect, useState } from 'react';
import { useData } from '../services/store';

export const DailyTasks: React.FC = () => {
  const { currentUser } = useData();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [today] = useState(() => new Date().toISOString().split('T')[0]);
  const [feedback, setFeedback] = useState({});

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
    fetchTasks();
  };

  const handleFeedback = (taskId, value) => {
    setFeedback(f => ({ ...f, [taskId]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-xl font-bold mb-4">Today's Tasks</h2>
      {loading ? <div>Loading...</div> : (
        <div className="space-y-4">
          {tasks.length === 0 && <div className="text-gray-500">No tasks assigned for today.</div>}
          {tasks.map(task => (
            <div key={task._id} className="bg-white rounded-lg border p-4 flex flex-col gap-2 shadow-sm">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={task.completed} onChange={e => handleTick(task, e.target.checked)} />
                <div>
                  <div className="font-semibold">{task.topic}</div>
                  <div className="text-xs text-gray-500">Session {task.sessionNumber} | {task.classGrade} {task.subject}</div>
                </div>
              </div>
              <textarea
                className="w-full border rounded p-2 text-sm mt-2"
                placeholder="Feedback (e.g. too fast, students absent, planner wrong, etc.)"
                value={feedback[task._id] || task.feedback || ''}
                onChange={e => handleFeedback(task._id, e.target.value)}
                onBlur={e => handleTick(task, task.completed)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

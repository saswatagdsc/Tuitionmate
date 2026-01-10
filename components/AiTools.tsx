import React, { useState } from 'react';
import { generateNotice, generateStudyTip } from '../services/gemini';
import { Sparkles, Send, Copy, BookOpen } from 'lucide-react';

export const AiTools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'notice' | 'tips'>('notice');
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [tone, setTone] = useState<'formal' | 'casual' | 'urgent'>('formal');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateNotice = async () => {
    if (!topic) return;
    setIsLoading(true);
    setGeneratedContent('');
    const result = await generateNotice(topic, tone);
    setGeneratedContent(result);
    setIsLoading(false);
  };

  const handleGenerateTip = async () => {
    if (!subject) return;
    setIsLoading(true);
    setGeneratedContent('');
    const result = await generateStudyTip(subject);
    setGeneratedContent(result);
    setIsLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    alert('Copied to clipboard!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-900 flex items-center justify-center gap-2">
          <Sparkles className="text-purple-600" />
          AI Assistant
        </h2>
        <p className="text-slate-500">Generate professional notices or study tips instantly.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => { setActiveTab('notice'); setGeneratedContent(''); }}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'notice' ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Generate Notice
          </button>
          <button
            onClick={() => { setActiveTab('tips'); setGeneratedContent(''); }}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'tips' ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Study Tips
          </button>
        </div>

        <div className="p-8">
          {activeTab === 'notice' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notice Topic</label>
                <input
                  type="text"
                  placeholder="e.g. Holiday on Friday, Fee Reminder, Test Postponed"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tone</label>
                <div className="flex gap-2">
                  {(['formal', 'casual', 'urgent'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`px-4 py-2 rounded-full text-sm capitalize border ${tone === t ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleGenerateNotice}
                disabled={isLoading || !topic}
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? 'Thinking...' : <><Sparkles size={18} /> Generate Notice</>}
              </button>
            </div>
          ) : (
             <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject / Concept</label>
                <input
                  type="text"
                  placeholder="e.g. Trigonometry, Thermodynamics, Mughal History"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <button
                onClick={handleGenerateTip}
                disabled={isLoading || !subject}
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? 'Searching...' : <><BookOpen size={18} /> Get Study Tip</>}
              </button>
            </div>
          )}

          {/* Result Area */}
          {generatedContent && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">AI Generated Output</span>
                <button onClick={copyToClipboard} className="text-slate-400 hover:text-purple-600 transition-colors">
                  <Copy size={16} />
                </button>
              </div>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap">
                {generatedContent}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useData } from '../services/store';
import { Settings as SettingsIcon, Save, Palette, Building } from 'lucide-react';

export const Settings: React.FC = () => {
  const { settings, updateSettings } = useData();
  const [formData, setFormData] = useState(settings);

  const handleSave = async () => {
    await updateSettings(formData);
    alert('Settings saved successfully!');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="w-6 h-6" /> Professional Branding
        </h2>
        <button 
          onClick={handleSave}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> Save Changes
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <Building className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-800">Institute Details</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Institute Name</label>
            <input
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
            <input
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
            <input
              value={formData.website || ''}
              onChange={e => setFormData({...formData, website: e.target.value})}
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
            <input
              value={formData.academicYear}
              onChange={e => setFormData({...formData, academicYear: e.target.value})}
              className="w-full p-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="p-6 border-t border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <Palette className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-800">Branding & Theme</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
           <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.primaryColor}
                onChange={e => setFormData({...formData, primaryColor: e.target.value})}
                className="h-10 w-20 p-1 border rounded cursor-pointer"
              />
              <span className="text-gray-500 font-mono">{formData.primaryColor}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Used for buttons, headers, and primary actions.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
             <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.accentColor}
                onChange={e => setFormData({...formData, accentColor: e.target.value})}
                className="h-10 w-20 p-1 border rounded cursor-pointer"
              />
              <span className="text-gray-500 font-mono">{formData.accentColor}</span>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-800">Privacy & Security</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-white mb-4">
             <div>
               <h4 className="font-bold text-gray-800">Data Backup</h4>
               <p className="text-sm text-gray-500">Download a complete copy of your institute's data.</p>
             </div>
             <button 
               onClick={() => {
                 const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(formData)); 
                 // In real app, this would fetch from db.json endpoint
                 alert("Backup download started... (Mock)");
               }}
               className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
             >
               Export Data
             </button>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg bg-white">
             <div>
               <h4 className="font-bold text-gray-800">App Security PIN</h4>
               <p className="text-sm text-gray-500">Set a 4-digit PIN to lock admin access.</p>
             </div>
             <div className="flex items-center gap-2">
                <input 
                  type="password" 
                  maxLength={4}
                  placeholder="PIN"
                  value={formData.appLockPin || ''}
                  onChange={e => setFormData({...formData, appLockPin: e.target.value})}
                  className="w-20 p-2 border rounded text-center font-bold tracking-widest outline-none focus:ring-2 focus:ring-blue-500"
                />
             </div>
          </div>
        </div>
      </div>

       <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2">Preview</h4>
        <div className="flex gap-4 items-center p-4 bg-white rounded border">
           <div 
             className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
             style={{ backgroundColor: formData.primaryColor }}
           >
             TM
           </div>
           <div>
             <h4 className="font-bold text-lg">{formData.name}</h4>
             <button 
               className="px-4 py-1 rounded text-sm text-white mt-1"
               style={{ backgroundColor: formData.primaryColor }}
             >
               Primary Button
             </button>
              <button 
               className="ml-2 px-4 py-1 rounded text-sm text-white mt-1"
               style={{ backgroundColor: formData.accentColor }}
             >
               Accent Button
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

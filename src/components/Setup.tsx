import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/authStore';
import { GRADE_LABELS } from '@/lib/types';
import { Save, Trash2, Plus, Building, CopyCheck, Download, Upload, Edit2, Check, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function Setup() {
  const { data, getClassesForGrade, setClassesForGrade, clearClassesForGrade, importSchoolData, renameGrade, renameClass } = useAppStore();
  const gradesList = data?.gradesOrder || GRADE_LABELS;
  const { currentUser, setActiveSchoolId, activeSchoolId, createSchool, updateSchool, systemData } = useAuthStore();
  const [sName, setSName] = useState(data?.schoolName || '');
  const [activeGrade, setActiveGrade] = useState(gradesList[0] || 'K1');

  const classesText = activeSchoolId ? getClassesForGrade(activeGrade).join(', ') : '';
  const [classListInput, setClassListInput] = useState(classesText);
  const [isCreatingNewSchool, setIsCreatingNewSchool] = useState(!activeSchoolId);
  
  const [editingGrade, setEditingGrade] = useState<{old: string, newName: string} | null>(null);
  const [editingClass, setEditingClass] = useState<{old: string, newName: string} | null>(null);

  useEffect(() => {
    if (!isCreatingNewSchool) {
        setSName(data?.schoolName || '');
        setClassListInput(activeSchoolId ? getClassesForGrade(activeGrade).join(', ') : '');
    }
  }, [data?.schoolName, activeGrade, isCreatingNewSchool, activeSchoolId]);

  const handleGradeChange = (g: string) => {
    setActiveGrade(g);
    setClassListInput(activeSchoolId ? getClassesForGrade(g).join(', ') : '');
  };

  const saveSchool = () => {
    if (!sName.trim()) {
        toast.error('School name is required');
        return;
    }
    if (isCreatingNewSchool) {
        const newId = createSchool(sName);
        setActiveSchoolId(newId);
        setIsCreatingNewSchool(false);
        toast.success('New school created!');
    } else if (activeSchoolId) {
        updateSchool(activeSchoolId, sName);
        toast.success('School profile updated!');
    }
  };

  const saveClasses = () => {
    if (!activeSchoolId) {
        toast.error('Please create/select a school first.');
        return;
    }
    const arr = classListInput.split(',').map(s => s.trim()).filter(Boolean);
    if (!arr.length) {
      toast.error('Enter at least one class section.');
      return;
    }
    setClassesForGrade(activeGrade, arr);
    toast.success(`Classes for Grade ${activeGrade} saved!`);
  };

  const clearClasses = () => {
    if (confirm(`Are you sure you want to delete ALL classes & assignments for Grade ${activeGrade}?`)) {
      clearClassesForGrade(activeGrade);
      setClassListInput('');
      toast.success('Classes cleared.');
    }
  };

  const handleRenameGrade = () => {
    if (editingGrade && editingGrade.newName.trim() && editingGrade.newName.trim() !== editingGrade.old) {
      renameGrade(editingGrade.old, editingGrade.newName.trim());
      setActiveGrade(editingGrade.newName.trim());
      setEditingGrade(null);
      toast.success('Grade renamed successfully!');
    } else {
      setEditingGrade(null);
    }
  };

  const handleRenameClass = () => {
    if (editingClass && editingClass.newName.trim() && editingClass.newName.trim() !== editingClass.old) {
      renameClass(activeGrade, editingClass.old, editingClass.newName.trim());
      // Re-fetch classes input to reflect changes if necessary
      const newClasses = getClassesForGrade(activeGrade).map(c => c === editingClass.old ? editingClass.newName.trim() : c);
      setClassListInput(newClasses.join(', '));
      setEditingClass(null);
      toast.success('Section renamed successfully!');
    } else {
      setEditingClass(null);
    }
  };

  const applyToAllGrades = () => {
    if (!activeSchoolId) {
        toast.error('Please create/select a school first.');
        return;
    }
    const arr = classListInput.split(',').map(s => s.trim()).filter(Boolean);
    if (!arr.length) {
      toast.error('Enter at least one class section.');
      return;
    }
    if (confirm(`Are you sure you want to apply sections [${arr.join(', ')}] to EVERY grade level?`)) {
        gradesList.forEach(g => setClassesForGrade(g, arr));
        toast.success(`Sections applied to all grades!`);
    }
  };

  const handleExportData = () => {
    if (!activeSchoolId) {
        toast.error('Select a school first.');
        return;
    }
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edudash_school_${sName.replace(/\s+/g, '_').toLowerCase()}_data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        const str = evt.target?.result as string;
        if (str) {
            const success = importSchoolData(str);
            if (success) toast.success('School data imported successfully!');
            else toast.error('Check your JSON file format.');
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  };

  if (!currentUser?.permissions.isAdmin) {
      return (
          <div className="p-8 text-center text-slate-500">
              <Building className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h2 className="text-xl font-bold text-slate-700">Access Denied</h2>
              <p>You do not have permission to modify school configuration.</p>
          </div>
      );
  }

  return (
    <div className="flex-1 flex flex-col gap-6 animate-in fade-in">
      <Toaster position="top-right" />
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">School Configuration</h1>
          <p className="text-slate-500 text-sm mt-1">Manage school profiles and structure.</p>
        </div>
        {!isCreatingNewSchool && (
            <button 
               onClick={() => { setIsCreatingNewSchool(true); setSName(''); }}
               className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
            >
               <Plus className="w-4 h-4" /> Create Another School
            </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
           {isCreatingNewSchool ? 'Create New School' : 'Edit School Name'}
        </h3>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">School Name</label>
            <input 
              type="text" 
              value={sName}
              onChange={(e) => setSName(e.target.value)}
              placeholder="e.g., Global Paradigm Academy"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-colors text-slate-900"
            />
          </div>
          <button 
            onClick={saveSchool}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium shadow-md shadow-indigo-200 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors w-full sm:w-auto"
          >
            <Save className="w-4 h-4" /> {isCreatingNewSchool ? 'Create School' : 'Update Name'}
          </button>
        </div>
      </div>

      {!isCreatingNewSchool && activeSchoolId && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-in slide-in-from-bottom-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Grade Levels & Sections</h3>
            <p className="text-sm text-slate-500 mb-6">Define class sections (e.g., A, B, C) for each grade in {sName}.</p>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {gradesList.map(g => (
                <button
                  key={g}
                  onClick={() => handleGradeChange(g)}
                  className={`px-4 py-2 rounded-lg font-semibold text-xs transition-colors border ${
                    activeGrade === g 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Grade {g}
                </button>
              ))}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
              <div className="mb-4 flex items-center gap-3">
                {editingGrade?.old === activeGrade ? (
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900 text-lg">Grade</strong>
                    <input 
                      type="text" 
                      value={editingGrade.newName}
                      onChange={e => setEditingGrade({ ...editingGrade, newName: e.target.value })}
                      onKeyDown={e => e.key === 'Enter' && handleRenameGrade()}
                      className="px-2 py-1 border border-slate-300 rounded text-sm w-32 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      autoFocus
                    />
                    <button onClick={handleRenameGrade} className="text-emerald-600 hover:text-emerald-700 p-1">
                      <Check size={18} />
                    </button>
                    <button onClick={() => setEditingGrade(null)} className="text-red-500 hover:text-red-600 p-1">
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <>
                    <strong className="text-slate-900 text-lg">Grade {activeGrade}</strong>
                    <button onClick={() => setEditingGrade({ old: activeGrade, newName: activeGrade })} className="text-slate-400 hover:text-indigo-600 transition-colors p-1" title="Rename Grade">
                       <Edit2 size={16} />
                    </button>
                  </>
                )}
              </div>
              
              <div className="mb-6 flex flex-wrap gap-2">
                {getClassesForGrade(activeGrade).map(c => (
                  <div key={c} className="flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700">
                     {editingClass?.old === c ? (
                       <div className="flex items-center gap-1">
                         <span>Class</span>
                         <input 
                            type="text" 
                            value={editingClass.newName}
                            onChange={e => setEditingClass({ ...editingClass, newName: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && handleRenameClass()}
                            className="px-1.5 py-0.5 border border-slate-300 rounded text-sm w-16 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                            autoFocus
                         />
                         <button onClick={handleRenameClass} className="text-emerald-600 hover:text-emerald-700 p-[1px]">
                           <Check size={14} />
                         </button>
                         <button onClick={() => setEditingClass(null)} className="text-red-500 hover:text-red-600 p-[1px]">
                           <X size={14} />
                         </button>
                       </div>
                     ) : (
                       <>
                         Class {c}
                         <button onClick={() => setEditingClass({ old: c, newName: c })} className="ml-1 text-slate-400 hover:text-indigo-600 transition-colors p-0.5" title="Rename Class">
                            <Edit2 size={14} />
                         </button>
                       </>
                     )}
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-[3] w-full">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Add or Overwrite Class Sections (comma-separated)</label>
                  <input 
                    type="text" 
                    value={classListInput}
                    onChange={e => setClassListInput(e.target.value)}
                    placeholder="A, B, C"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-colors text-slate-900"
                  />
                </div>
                <div className="flex gap-2 flex-[2] w-full mt-4 sm:mt-0">
                  <button 
                    onClick={saveClasses}
                    className="flex-1 bg-slate-900 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Save
                  </button>
                  <button 
                    onClick={applyToAllGrades}
                    className="flex-1 bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2.5 rounded-lg font-medium shadow-sm hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                    title="Apply these sections to EVERY grade level"
                  >
                    <CopyCheck className="w-4 h-4" /> Apply All
                  </button>
                  {getClassesForGrade(activeGrade).length > 0 && (
                    <button 
                      onClick={clearClasses}
                      className="flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 font-medium rounded-lg transition-colors"
                      title="Clear Classes"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
      )}

      {!isCreatingNewSchool && activeSchoolId && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-in slide-in-from-bottom-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Data Management</h3>
            <p className="text-sm text-slate-500 mb-6">Backup or restore configuration for {sName}.</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={handleExportData}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors w-full sm:w-auto"
              >
                <Download className="w-4 h-4" /> Export School JSON
              </button>
              <label className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-indigo-600 font-medium rounded-lg transition-colors cursor-pointer w-full sm:w-auto">
                <Upload className="w-4 h-4" /> Import School JSON
                <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
              </label>
            </div>
          </div>
      )}
    </div>
  );
}

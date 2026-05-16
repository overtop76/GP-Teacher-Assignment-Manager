import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/authStore';
import { GRADE_LABELS } from '@/lib/types';
import { Grid, Download, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AssignmentsMatrix() {
  const { data, getClassesForGrade } = useAppStore();
  const [filterGrade, setFilterGrade] = useState<string>('all');
  
  // Aggregate all unique subjects
  const allAvailableSubjects = new Set<string>();
  const classListForTable: { grade: string, className: string, subjectsData: Record<string, string> }[] = [];

  GRADE_LABELS.forEach(g => {
    getClassesForGrade(g).forEach(c => {
      const subjects = data.gradeLevels[g].classes[c].subjects || {};
      Object.entries(subjects).forEach(([sId, subj]: [string, any]) => {
        if (subj.isFL) {
           Object.keys(subj.languages || {}).forEach(langId => allAvailableSubjects.add(`FL: ${langId}`));
        } else if (subj.isArtMusic) {
           Object.keys(subj.subSubjects || {}).forEach(subId => allAvailableSubjects.add(`A/M: ${subId}`));
        } else if (subj.isElective) {
           const block = subj.name || sId;
           Object.keys(subj.electives || {}).forEach(elName => allAvailableSubjects.add(`${block}: ${elName}`));
        } else {
           allAvailableSubjects.add(sId);
        }
      });
    });
  });

  const uniqueSubjects = Array.from(allAvailableSubjects).sort();

  GRADE_LABELS.forEach(g => {
    if (filterGrade !== 'all' && filterGrade !== g) return;
    getClassesForGrade(g).forEach(c => {
      const subjectsData: Record<string, string> = {};
      const subjects = data.gradeLevels[g].classes[c].subjects || {};
      
      uniqueSubjects.forEach(s => {
          let teacherVal = '';
          if (s.startsWith('FL: ')) {
               const lang = s.replace('FL: ', '');
               if (subjects['FL']?.languages?.[lang]) teacherVal = subjects['FL'].languages[lang].teacher;
          } else if (s.startsWith('A/M: ')) {
               const am = s.replace('A/M: ', '');
               if (subjects['Art/Music']?.subSubjects?.[am]) teacherVal = subjects['Art/Music'].subSubjects[am].teacher;
          } else if (s.includes(': ')) {
               const [block, elName] = s.split(': ');
               if (subjects[block]?.electives?.[elName]) teacherVal = subjects[block].electives[elName].teacher;
          } else {
               if (subjects[s] && !subjects[s].isFL && !subjects[s].isArtMusic && !subjects[s].isElective) {
                   teacherVal = subjects[s].teacher || '';
               }
          }
          if (teacherVal) subjectsData[s] = teacherVal;
      });
      
      classListForTable.push({ grade: g, className: c, subjectsData });
    });
  });

  const handleExportExcel = () => {
    const exportData = classListForTable.map(cls => {
      const rowData: any = {
        'Grade': cls.grade,
        'Class': cls.className,
      };
      uniqueSubjects.forEach(s => {
        rowData[s] = cls.subjectsData[s] || '-';
      });
      return rowData;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Matrix");
    XLSX.writeFile(wb, `Assignments_Matrix_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 animate-in">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Assignment Matrix</h1>
          <p className="text-slate-500 text-sm mt-1">Cross-reference all classes and subjects at a glance.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
             <label className="text-sm font-semibold text-slate-700">Filter Grade:</label>
             <select 
               value={filterGrade}
               onChange={e => setFilterGrade(e.target.value)}
               className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500/20"
             >
               <option value="all">All Grades</option>
               {GRADE_LABELS.map(g => (
                 <option key={g} value={g}>Grade {g}</option>
               ))}
             </select>
          </div>
          <button 
             onClick={handleExportExcel}
             className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors"
          >
             <Download size={14} /> Export Matrix
          </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 overflow-auto max-h-[70vh]">
         <table className="w-full text-left border-collapse whitespace-nowrap min-w-max">
            <thead>
               <tr className="bg-slate-900 text-white border-b border-slate-700">
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-widest sticky left-0 bg-slate-900 z-10 border-r border-slate-700">Class</th>
                  {uniqueSubjects.map(s => (
                      <th key={s} className="px-4 py-3 font-medium text-xs border-r border-slate-700/50">
                         {s}
                      </th>
                  ))}
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
               {classListForTable.length === 0 ? (
                  <tr>
                     <td colSpan={uniqueSubjects.length + 1} className="p-8 text-center text-slate-500 italic">No classes found</td>
                  </tr>
               ) : classListForTable.map((row, idx) => {
                  return (
                      <tr key={`${row.grade}-${row.className}`} className="hover:bg-slate-50/80">
                         <td className="px-4 py-2.5 font-bold text-slate-700 sticky left-0 bg-white border-r border-slate-200 shadow-[1px_0_0_0_#f1f5f9] group-hover:bg-slate-50">
                            Gr {row.grade} - {row.className}
                         </td>
                         {uniqueSubjects.map(s => {
                             const teacher = row.subjectsData[s];
                             return (
                                <td key={s} className="px-4 py-2.5 border-r border-slate-100 text-slate-600">
                                   {teacher ? (
                                      <span className="font-medium text-indigo-700">{teacher}</span>
                                   ) : (
                                      <span className="text-slate-300">-</span>
                                   )}
                                </td>
                             )
                         })}
                      </tr>
                  )
               })}
            </tbody>
         </table>
      </div>
    </div>
  );
}

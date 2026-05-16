import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/authStore';
import { GRADE_LABELS } from '@/lib/types';
import { Grid, Download, AlertTriangle, Edit2, UserCheck, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

export default function AssignmentsMatrix() {
  const { data, getClassesForGrade } = useAppStore();
  const [filterGrade, setFilterGrade] = useState<string>('all');
  
  const gradesList = data.gradesOrder || GRADE_LABELS;

  // Aggregate all unique subjects
  const allAvailableSubjects = new Set<string>();
  const classListForTable: { grade: string, className: string, subjectsData: Record<string, string> }[] = [];

  gradesList.forEach(g => {
    getClassesForGrade(g).forEach(c => {
      const subjects = data.gradeLevels[g]?.classes[c]?.subjects || {};
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

  gradesList.forEach(g => {
    if (filterGrade !== 'all' && filterGrade !== g) return;
    getClassesForGrade(g).forEach(c => {
      const subjectsData: Record<string, string> = {};
      const subjects = data.gradeLevels[g]?.classes[c]?.subjects || {};
      
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
    if (classListForTable.length === 0) {
      toast.error('No data to export.');
      return;
    }
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

  const handlePrint = () => {
    if (classListForTable.length === 0) {
      toast.error('No data to print.');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup blocked. Cannot print.');
      return;
    }
    
    const thHTML = uniqueSubjects.map(s => `<th style="padding: 8px; border: 1px solid #ccc; background: #f8fafc; font-size: 10px;">${s}</th>`).join('');
    
    const trHTML = classListForTable.map(row => {
      const tdHTML = uniqueSubjects.map(s => `<td style="padding: 8px; border: 1px solid #ccc; font-size: 10px;">${row.subjectsData[s] || '-'}</td>`).join('');
      return `<tr><td style="padding: 8px; border: 1px solid #ccc; font-size: 12px; font-weight: bold;">Gr ${row.grade} - ${row.className}</td>${tdHTML}</tr>`;
    }).join('');

    const htmlContent = `
      <html>
        <head>
          <title>Assignment Matrix - ${new Date().toISOString().slice(0,10)}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #fff; margin: 20px; }
            h1 { font-size: 20px; text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            @media print {
              body { margin: 0; }
              table { font-size: 10px; }
            }
          </style>
        </head>
        <body>
          <h1>Assignment Matrix</h1>
          <table>
            <thead>
              <tr>
                <th style="padding: 8px; border: 1px solid #ccc; background: #eee; font-size: 12px; text-align: left;">Class</th>
                ${thHTML}
              </tr>
            </thead>
            <tbody>
              ${trHTML}
            </tbody>
          </table>
          <script>
            setTimeout(() => { window.print(); window.close(); }, 500);
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="flex-1 flex flex-col gap-6 animate-in">
      <div className="flex items-end justify-between print-hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Assignment Matrix</h1>
          <p className="text-slate-500 text-sm mt-1">Cross-reference all classes and subjects at a glance.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print-hidden">
          <div className="flex items-center gap-3 w-full sm:w-auto">
             <label className="text-sm font-semibold text-slate-700">Filter Grade:</label>
             <select 
               value={filterGrade}
               onChange={e => setFilterGrade(e.target.value)}
               className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500/20"
             >
               <option value="all">All Grades</option>
               {gradesList.map(g => (
                 <option key={g} value={g}>Grade {g}</option>
               ))}
             </select>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
             <div className="text-xs text-slate-500 hidden md:block">
               <span className="font-bold text-slate-700">{uniqueSubjects.length}</span> Subjects cross-referenced
             </div>
             <button 
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
             >
                <Printer size={14} /> Print
             </button>
             <button 
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors"
             >
                <Download size={14} /> Export Matrix
             </button>
          </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 overflow-auto max-h-[70vh] matrix-scrollbar relative">
         {classListForTable.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <UserCheck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium text-slate-700">No classes found</p>
              <p className="text-sm">Adjust your filters or setup classes first.</p>
            </div>
         ) : (
           <table className="w-full text-left border-collapse whitespace-nowrap min-w-max">
              <thead>
                 <tr className="bg-slate-900 text-white border-b border-slate-700">
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-widest sticky bg-slate-900 left-0 top-0 z-30 border-r border-slate-700 shadow-[1px_1px_0_0_#334155,0_1px_0_0_#334155]">
                      Class
                    </th>
                    {uniqueSubjects.map(s => (
                        <th key={s} className="px-4 py-3 font-medium text-xs border-r border-slate-700/50 hover:bg-slate-800 transition-colors sticky top-0 z-20 bg-slate-900 shadow-[0_1px_0_0_#334155]" title={s}>
                           <div className="min-w-[140px] max-w-[200px] truncate">
                             {s}
                           </div>
                        </th>
                    ))}
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                 {classListForTable.map((row, idx) => {
                    return (
                        <tr key={`${row.grade}-${row.className}`} className="hover:bg-slate-50/80 group">
                           <td className="px-4 py-2.5 font-bold text-slate-700 sticky left-0 bg-white border-r border-slate-200 shadow-[1px_0_0_0_#f1f5f9] group-hover:bg-slate-50 z-10 transition-colors">
                              Gr {row.grade} - {row.className}
                           </td>
                           {uniqueSubjects.map(s => {
                               const teacher = row.subjectsData[s];
                               return (
                               <td key={s} className="px-4 py-2.5 border-r border-slate-100 text-slate-600 transition-colors">
                                     {teacher ? (
                                        <div className="flex items-center min-w-[140px] max-w-[200px]">
                                          <span className="font-medium text-indigo-700 truncate" title={teacher}>{teacher}</span>
                                        </div>
                                     ) : (
                                        <div className="min-w-[140px] max-w-[200px] text-slate-200 text-center">-</div>
                                     )}
                                  </td>
                               )
                           })}
                        </tr>
                    )
                 })}
              </tbody>
           </table>
         )}
      </div>
    </div>
  );
}

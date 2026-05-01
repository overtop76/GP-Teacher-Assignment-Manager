import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';

const COLORS = ['#4f46e5', '#ec4899', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316'];

export default function Visualization() {
  const { data } = useAppStore();
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [metric, setMetric] = useState<'workload' | 'subjectLoad'>('workload');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');

  const allGrades = useMemo(() => {
    return Object.keys(data.gradeLevels || {}).sort((a, b) => a.localeCompare(b));
  }, [data.gradeLevels]);
  
  // Calculate teacher workload data
  const teacherStats = useMemo(() => {
    const stats: Record<string, {
      name: string;
      sessions: number;
      gender: string;
    }> = {};

    Object.keys(data.teachers || {}).forEach(tName => {
      const tId = data.teachers[tName];
      stats[tName] = {
        name: tName,
        sessions: 0,
        gender: data.teacherProfiles?.[tId]?.gender || 'Unknown'
      };
    });

    Object.entries(data.gradeLevels).forEach(([gradeName, g]: [string, any]) => {
      if (gradeFilter !== 'all' && gradeName !== gradeFilter) return;
      Object.values(g.classes || {}).forEach((c: any) => {
        Object.values(c.subjects || {}).forEach((subj: any) => {
          if (subj.teacher && stats[subj.teacher]) {
            stats[subj.teacher].sessions += subj.sessions || 0;
          }
          if (subj.isFL && subj.languages) {
             Object.values(subj.languages).forEach((lData: any) => {
               if (lData.teacher && stats[lData.teacher]) {
                 stats[lData.teacher].sessions += subj.sessions || 0;
               }
             });
          }
          if (subj.isArtMusic && subj.subSubjects) {
             Object.values(subj.subSubjects).forEach((amData: any) => {
               if (amData.teacher && stats[amData.teacher]) {
                 stats[amData.teacher].sessions += subj.sessions || 0;
               }
             });
          }
          if (subj.isElective && subj.electives) {
             Object.values(subj.electives).forEach((elData: any) => {
               if (elData.teacher && stats[elData.teacher]) {
                 stats[elData.teacher].sessions += subj.sessions || 0;
               }
             });
          }
        });
      });
    });

    return Object.values(stats);
  }, [data, gradeFilter]);

  // Calculate subject load data
  const subjectStats = useMemo(() => {
    const stats: Record<string, number> = {};

    Object.entries(data.gradeLevels).forEach(([gradeName, g]: [string, any]) => {
      if (gradeFilter !== 'all' && gradeName !== gradeFilter) return;
      Object.values(g.classes || {}).forEach((c: any) => {
        Object.entries(c.subjects || {}).forEach(([sName, subj]: [string, any]) => {
          if (!['FL', 'Art/Music'].includes(sName) && !subj.isElective) {
             stats[sName] = (stats[sName] || 0) + (subj.sessions || 0);
          }
          if (subj.isFL && subj.languages) {
             Object.keys(subj.languages).forEach(lang => {
               stats[lang] = (stats[lang] || 0) + (subj.sessions || 0);
             });
          }
          if (subj.isArtMusic && subj.subSubjects) {
             Object.keys(subj.subSubjects).forEach(am => {
               stats[am] = (stats[am] || 0) + (subj.sessions || 0);
             });
          }
          if (subj.isElective && subj.electives) {
             Object.keys(subj.electives).forEach(elName => {
               stats[elName] = (stats[elName] || 0) + (subj.sessions || 0);
             });
          }
        });
      });
    });

    return Object.entries(stats).map(([name, sessions]) => ({ name, sessions })).sort((a, b) => b.sessions - a.sessions);
  }, [data, gradeFilter]);

  const filteredTeacherStats = useMemo(() => {
    let result = teacherStats;
    if (gradeFilter !== 'all') {
      result = result.filter(t => t.sessions > 0);
    }
    if (genderFilter !== 'all') {
      result = result.filter(t => t.gender === genderFilter);
    }
    // Sort by sessions descending to make chart look better
    return result.sort((a, b) => b.sessions - a.sessions);
  }, [teacherStats, genderFilter, gradeFilter]);

  const chartData = metric === 'workload' ? filteredTeacherStats : subjectStats;
  const xAxisKey = 'name';
  const dataKey = 'sessions';

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Data Visualization</h2>
            <p className="text-sm text-slate-500">Visualize workload across your school</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Grades</option>
              {allGrades.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as 'workload' | 'subjectLoad')}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="workload">Teacher Workload</option>
              <option value="subjectLoad">Subject Workload</option>
            </select>
            
            {metric === 'workload' && (
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            )}

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setChartType('bar')}
                className={`p-1.5 rounded-md flex items-center transition-colors ${chartType === 'bar' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                title="Bar Chart"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('pie')}
                className={`p-1.5 rounded-md flex items-center transition-colors ${chartType === 'pie' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                title="Pie Chart"
              >
                <PieChartIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="w-full h-[500px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey={xAxisKey} 
                  angle={-45} 
                  textAnchor="end" 
                  height={80} 
                  interval={0} 
                  tick={{fontSize: 12, fill: '#64748B'}} 
                />
                <YAxis tick={{fontSize: 12, fill: '#64748B'}} />
                <RechartsTooltip 
                  cursor={{fill: '#F1F5F9'}} 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'}}
                />
                <Legend wrapperStyle={{paddingTop: '20px'}} />
                <Bar dataKey={dataKey} name="Total Sessions" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={180}
                  fill="#8884d8"
                  dataKey={dataKey}
                  nameKey={xAxisKey}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'}}
                />
                <Legend />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

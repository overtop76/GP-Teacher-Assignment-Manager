import React from 'react';
import { BookOpen, GraduationCap, UserCheck, BarChart3, Settings, Users, HelpCircle } from 'lucide-react';

export default function Help() {
  return (
    <div className="flex-1 flex flex-col gap-6 animate-in">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Help & Guide</h1>
        <p className="text-slate-500 text-sm mt-1">Learn how to configure subjects, assignments, manage users, and export reports.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
           <div className="flex items-center gap-3 mb-2 border-b border-slate-100 pb-4">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                 <GraduationCap className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Teacher Management</h2>
           </div>
           
           <div className="space-y-4">
              <p className="text-slate-600 text-sm leading-relaxed">
                 The Teacher Management tab allows you to configure the profile and constraints of each teacher in your school.
              </p>
              
              <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
                 <li><strong>Add Teachers:</strong> Click "Add Teacher" and provide their Name, Initial, Minimum/Maximum Sessions per week, and designate if they are a Head of Department (HoD).</li>
                 <li><strong>Session Limits:</strong> The Minimum and Maximum sessions serve as constraints when you assign classes later. If a teacher's assignments drop below the minimum or exceed the maximum, the system will raise an alert in the Dashboard and Assignments views.</li>
                 <li><strong>Heads of Department:</strong> Marking a teacher as "HoD" helps track leadership roles in the Dashboard Summary.</li>
                 <li><strong>Edit/Delete:</strong> You can edit a teacher's details or remove them. Note: If you remove a teacher, they will be unassigned from all their current subjects.</li>
              </ul>
           </div>
        </div>

        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
           <div className="flex items-center gap-3 mb-2 border-b border-slate-100 pb-4">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                 <UserCheck className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Teacher Assignments</h2>
           </div>
           
           <div className="space-y-4">
              <p className="text-slate-600 text-sm leading-relaxed">
                 The Teacher Assignments tab is where you link teachers to the subjects they teach in specific classes and grades.
              </p>
              
              <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
                 <li><strong>Select Grade & Class:</strong> Navigate through the configured grades and select a class.</li>
                 <li><strong>Subject Grid:</strong> You will see a list of subjects assigned to that class (configured in School Setup). For each subject, you can either assign a teacher or leave it <code>Unassigned</code>.</li>
                 <li><strong>Sub-subjects & Languages:</strong> For grouped subjects like First Language or Art/Music, you must assign a teacher to each specific language or sub-subject (e.g., assigning a teacher to Arabic and another to Spanish).</li>
                 <li><strong>Workload Feedback:</strong> Each teacher in the dropdown shows their current session count / maximum sessions, giving you real-time visibility into their workload.</li>
                 <li><strong>Clear All:</strong> You can bulk-clear all teachers in a class.</li>
              </ul>
           </div>
        </div>

        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
           <div className="flex items-center gap-3 mb-2 border-b border-slate-100 pb-4">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                 <BarChart3 className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Analytics & Reports</h2>
           </div>
           
           <div className="space-y-4">
              <p className="text-slate-600 text-sm leading-relaxed">
                 The Analytics & Reports tab provides comprehensive exports and insights into your school's workload distribution.
              </p>
              
              <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
                 <li><strong>Teacher Workload Report:</strong> Lists every teacher, showing how many sessions they teach vs. their min/max limits, highlighting underutilized or overutilized teachers.</li>
                 <li><strong>Unassigned Subjects Report:</strong> Helps you quickly identify which grades and classes lack a teacher for specific subjects.</li>
                 <li><strong>Grade/Class Distribution:</strong> Summarizes the number of subjects and sessions in every configured class.</li>
                 <li><strong>Subject Teacher Load:</strong> Provides a breakdown of which teachers are teaching what subjects, and how many sessions they dedicate to each subject.</li>
                 <li><strong>Export to CSV:</strong> Several tables provide an easy mechanism to export the data straight into CSV format for formatting in Excel or Google Sheets.</li>
              </ul>
           </div>
        </div>

        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
           <div className="flex items-center gap-3 mb-2 border-b border-slate-100 pb-4">
              <div className="p-2.5 bg-slate-50 text-slate-600 rounded-lg">
                 <Settings className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">School Setup & Settings</h2>
           </div>
           
           <div className="space-y-4">
              <p className="text-slate-600 text-sm leading-relaxed">
                 The initial backbone of your app, configured primarily by administrators.
              </p>
              
              <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
                 <li><strong>Create Classes:</strong> Navigate to any grade to add a class (e.g. Class A, Class B).</li>
                 <li><strong>Subject Checkbox Grid:</strong> Select which subjects are taught in each class, and set the weekly session counts.</li>
                 <li><strong>Bulk Apply:</strong> Configure subjects and sessions for one class, then bulk-apply that configuration to all other classes in the same grade.</li>
                 <li><strong>Dashboard:</strong> Summarizes all configured metrics: number of assignments, HoDs, Unique Teachers, and session alerts where class totals deviate. Dashboard supports multi-select filters on Grades, Classes, and Subjects.</li>
              </ul>
           </div>
        </div>

      </div>
    </div>
  );
}

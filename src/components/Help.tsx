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
                 The Teacher Management tab allows you to configure teacher profiles, roles, assignments, and export/import data.
              </p>
              
              <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
                 <li><strong>Add Teachers & Quick Assign:</strong> Click "Add Teacher" to configure a teacher. You can optionally make a quick assignment, setting them to teach a Standard Subject, an FL (Foreign Language) Block, an Art/Music Block, or a Custom Elective Block for a specific grade and class.</li>
                 <li><strong>Head of Department (HoD):</strong> Toggle the badge to mark a teacher as HoD. You can refine their scope by assigning specific subjects and grades they oversee.</li>
                 <li><strong>Import & Export:</strong> Export your teacher list as Excel, PDF, or JSON. You can also import a JSON payload to modify roles or update records in bulk.</li>
                 <li><strong>Complex Subjects:</strong> Assigning to FL Blocks, Art/Music Blocks, or custom Electives automatically handles assigning to the right sub-subject or language, keeping standard subjects separate.</li>
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
                 <li><strong>Custom Electives:</strong> You can assign multiple electives per class. Click "Assign Elective", name the Elective Block, define the sub-subjects (e.g. Physics, Biology), and choose teachers for each.</li>
                 <li><strong>Copy Assignments:</strong> Use "Copy to another school" or "Copy to another class" to duplicate class structural layouts instantly, preserving or shedding teacher info seamlessly.</li>
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
                 <li><strong>Teacher Workload Report:</strong> Lists every teacher, showing how many sessions they teach vs. their target load.</li>
                 <li><strong>Unassigned Subjects Report:</strong> Helps you quickly identify which grades and classes lack a teacher for specific subjects.</li>
                 <li><strong>Subject & Elective Summaries:</strong> Detailed breakdowns regarding how many sessions each parallel block utilizes.</li>
                 <li><strong>Export to PDF & JSON:</strong> Print these dashboards directly or grab JSON representations of assignment snapshots.</li>
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
                 <li><strong>Subject Configuration:</strong> Select which subjects are taught in each class, and set the weekly session counts. Support for Standard Subjects, FL Blocks, Art/Music Blocks, and Electives.</li>
                 <li><strong>Bulk Apply & Copy Class:</strong> Configure subjects for one class, then bulk-apply to the whole grade, or selectively copy subjects across grades and classes.</li>
                 <li><strong>Multi-School Support:</strong> If you represent a conglomerate or manage multiple schools, you can create new schools, load their data securely via Firebase, and switch between them.</li>
              </ul>
           </div>
        </div>

      </div>
    </div>
  );
}

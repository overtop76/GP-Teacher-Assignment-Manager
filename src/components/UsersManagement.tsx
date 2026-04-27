import React, { useState } from 'react';
import { useAuthStore } from '@/lib/authStore';
import { User, Plus, Trash2, Edit, Save, X, Shield, Lock, School, Key } from 'lucide-react';
import { GRADE_LABELS, UserAccount } from '@/lib/types';

export default function UsersManagement() {
  const { systemData, createUser, updateUser, deleteUser, currentUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<UserAccount>>({});
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  const handleEdit = (user: UserAccount) => {
    setIsEditing(user.id);
    setFormData(user);
    setIsCreating(false);
  };

  const handleResetPassword = (user: UserAccount) => {
    if (confirm(`Are you sure you want to reset the password for ${user.username}?`)) {
      const newPassword = Math.random().toString(36).substr(2, 8);
      updateUser(user.id, { passwordText: newPassword });
      setShowPasswordMap(prev => ({ ...prev, [user.id]: true }));
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(null);
    setFormData({
      username: '',
      passwordText: Math.random().toString(36).substr(2, 8),
      permissions: {
        isAdmin: false,
        canEditGrades: [],
        canViewGrades: [],
        canPrintExport: false,
      },
      assignedSchools: [],
    });
  };

  const cancelEdit = () => {
    setIsEditing(null);
    setIsCreating(false);
    setFormData({});
  };

  const handleSave = () => {
    if (!formData.username || !formData.passwordText) return;
    
    if (isCreating) {
      createUser(formData as Omit<UserAccount, 'id'>);
    } else if (isEditing) {
      updateUser(isEditing, formData);
    }
    
    cancelEdit();
  };

  const togglePassword = (id: string) => {
    setShowPasswordMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const updatePermission = (key: keyof UserAccount['permissions'], value: any) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [key]: value
      }
    });
  };

  const toggleGrade = (type: 'canEditGrades' | 'canViewGrades', grade: string) => {
    const list = formData.permissions?.[type] || [];
    const newList = list.includes(grade) ? list.filter(g => g !== grade) : [...list, grade];
    updatePermission(type, newList);
  };

  const toggleAssignedSchool = (schoolId: string) => {
     let list = formData.assignedSchools || [];
     if (schoolId === 'ALL') {
         if (list.includes('ALL')) {
             list = [];
         } else {
             list = ['ALL'];
         }
     } else {
         if (list.includes('ALL')) list = list.filter(s => s !== 'ALL');
         list = list.includes(schoolId) ? list.filter(s => s !== schoolId) : [...list, schoolId];
     }
     setFormData({ ...formData, assignedSchools: list });
  };

  if (!currentUser?.permissions.isAdmin) {
      return (
          <div className="p-8 text-center text-slate-500">
              <Shield className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h2 className="text-xl font-bold text-slate-700">Access Denied</h2>
              <p>You do not have permission to view this page.</p>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Users</h1>
          <p className="text-slate-500 mt-1">Manage admin and staff accounts</p>
        </div>
        {!isCreating && !isEditing && (
          <button 
             onClick={handleCreate}
             className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
        )}
      </div>

      {(isCreating || isEditing) && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4">
           <div className="border-b border-slate-200 p-4 bg-slate-50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                 <User className="w-5 h-5 text-indigo-500" />
                 {isCreating ? 'Create New User' : 'Edit User'}
              </h3>
              <div className="flex items-center gap-2">
                 <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
              </div>
           </div>
           
           <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-5">
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Username</label>
                    <input 
                       type="text" 
                       value={formData.username || ''} 
                       onChange={e => setFormData({ ...formData, username: e.target.value })}
                       className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                    <div className="relative">
                       <input 
                          type="text" 
                          value={formData.passwordText || ''} 
                          onChange={e => setFormData({ ...formData, passwordText: e.target.value })}
                          className="w-full pl-4 pr-10 py-2 border border-slate-300 rounded-lg text-sm font-mono tracking-wider focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                       />
                       <button 
                          onClick={() => setFormData({ ...formData, passwordText: Math.random().toString(36).substr(2, 10) })}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600"
                          title="Generate new password"
                       >
                          <Lock className="w-4 h-4" />
                       </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Passwords are visible here for easy distribution.</p>
                 </div>
                 
                 <div className="pt-4 border-t border-slate-100">
                     <label className="flex items-center gap-3 cursor-pointer group">
                        <input 
                           type="checkbox" 
                           checked={formData.permissions?.isAdmin || false}
                           onChange={e => updatePermission('isAdmin', e.target.checked)}
                           className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500"
                        />
                        <div>
                           <span className="block text-sm font-bold text-slate-800">System Administrator</span>
                           <span className="block text-[11px] text-slate-500 group-hover:text-slate-600">Full access to all schools, settings, and users.</span>
                        </div>
                     </label>
                 </div>

                 {!formData.permissions?.isAdmin && (
                    <div className="pt-2">
                       <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                             type="checkbox" 
                             checked={formData.permissions?.canPrintExport || false}
                             onChange={e => updatePermission('canPrintExport', e.target.checked)}
                             className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500"
                          />
                          <div>
                             <span className="block text-sm font-bold text-slate-800">Can Print / Export Maps</span>
                             <span className="block text-[11px] text-slate-500">Allow user to print or export data to Excel/PDF.</span>
                          </div>
                       </label>
                    </div>
                 )}
              </div>

              {!formData.permissions?.isAdmin && (
                  <div className="space-y-6">
                     <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Assigned Schools</label>
                        <div className="flex flex-col gap-2 max-h-40 overflow-y-auto p-3 border border-slate-200 rounded-lg bg-slate-50">
                           <label className="flex items-center gap-3 cursor-pointer">
                              <input type="checkbox" checked={formData.assignedSchools?.includes('ALL') || false} onChange={() => toggleAssignedSchool('ALL')} />
                              <span className="text-sm font-bold text-slate-800">All Schools</span>
                           </label>
                           {systemData.schools.map(school => (
                              <label key={school.id} className="flex items-center gap-3 cursor-pointer">
                                 <input 
                                    type="checkbox" 
                                    checked={formData.assignedSchools?.includes(school.id) || false} 
                                    onChange={() => toggleAssignedSchool(school.id)} 
                                    disabled={formData.assignedSchools?.includes('ALL')}
                                 />
                                 <span className="text-sm text-slate-700">{school.name}</span>
                              </label>
                           ))}
                        </div>
                     </div>

                     <div>
                        <div className="mb-2">
                            <label className="block text-sm font-semibold text-slate-700">Grade Access Control</label>
                            <span className="text-[11px] text-slate-500">Leave all unchecked to grant access to all grades.</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                           {GRADE_LABELS.map(g => {
                              const canEdit = formData.permissions?.canEditGrades?.includes(g);
                              const canView = formData.permissions?.canViewGrades?.includes(g);
                              return (
                                 <div key={g} className="border border-slate-200 rounded-lg p-2 bg-white flex flex-col items-center gap-2">
                                    <span className="text-xs font-bold w-full text-center border-b pb-1">Grade {g}</span>
                                    <div className="flex px-1 gap-2 w-full justify-around">
                                       <label className="flex flex-col items-center gap-1 cursor-pointer">
                                          <input type="checkbox" checked={canView} onChange={() => toggleGrade('canViewGrades', g)} />
                                          <span className="text-[10px] text-slate-500 font-medium">View</span>
                                       </label>
                                       <label className="flex flex-col items-center gap-1 cursor-pointer">
                                          <input type="checkbox" checked={canEdit} onChange={() => toggleGrade('canEditGrades', g)} />
                                          <span className="text-[10px] text-slate-500 font-medium z-10 w-full text-center pr-1 pl-0 ml-0 hover:text-slate-800">Edit</span>
                                       </label>
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                  </div>
              )}
           </div>
           
           <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button 
                 onClick={cancelEdit} 
                 className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                 Cancel
              </button>
              <button 
                 onClick={handleSave} 
                 className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                 <Save className="w-4 h-4" /> Save User
              </button>
           </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Password</th>
                <th className="px-6 py-4">Role / Schools</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {systemData.users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">{user.username.substring(0, 2).toUpperCase()}</div>
                     {user.username}
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-mono">
                     {showPasswordMap[user.id] ? user.passwordText : '••••••••'}
                     <button onClick={() => togglePassword(user.id)} className="ml-3 text-[10px] uppercase font-bold text-indigo-500 hover:text-indigo-700">
                        {showPasswordMap[user.id] ? 'Hide' : 'Show'}
                     </button>
                  </td>
                  <td className="px-6 py-4">
                     {user.permissions.isAdmin ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 text-xs font-bold border border-rose-100">
                           <Shield className="w-3.5 h-3.5" /> Admin
                        </span>
                     ) : (
                        <div className="flex flex-col gap-1">
                           <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold w-fit border border-slate-200">
                              <User className="w-3.5 h-3.5" /> Staff
                           </span>
                           <span className="text-[10px] text-slate-500 font-medium ml-1 flex items-center gap-1">
                              <School className="w-3 h-3" />
                              {user.assignedSchools.includes('ALL') ? 'All Schools' : `${user.assignedSchools.length} School(s)`}
                           </span>
                        </div>
                     )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                       onClick={() => handleResetPassword(user)}
                       className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                       title="Reset password"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button 
                       onClick={() => handleEdit(user)}
                       className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                       title="Edit details"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {systemData.users.length > 1 && user.id !== currentUser?.id && (
                       <button 
                          onClick={() => {
                             if(confirm('Are you sure you want to delete this user?')) deleteUser(user.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Remove user"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    )}
                  </td>
                </tr>
              ))}
              {systemData.users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

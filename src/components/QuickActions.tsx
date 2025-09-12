import React from 'react';
import { Mail, FolderOpen, Calendar, Globe, Zap, FileText, Users, Database } from 'lucide-react';

interface QuickActionsProps {
  onExecuteAction: (action: string) => void;
}

export default function QuickActions({ onExecuteAction }: QuickActionsProps) {
  const actions = [
    {
      id: 'email',
      name: 'Draft Email',
      icon: Mail,
      color: 'from-red-500 to-pink-500',
      action: 'Draft important email'
    },
    {
      id: 'files',
      name: 'Organize Files',
      icon: FolderOpen,
      color: 'from-blue-500 to-cyan-500',
      action: 'Organize project files'
    },
    {
      id: 'calendar',
      name: 'Schedule Meeting',
      icon: Calendar,
      color: 'from-green-500 to-emerald-500',
      action: 'Schedule team meeting'
    },
    {
      id: 'research',
      name: 'Research Task',
      icon: Globe,
      color: 'from-purple-500 to-violet-500',
      action: 'Research market trends'
    },
    {
      id: 'workflow',
      name: 'Run Workflow',
      icon: Zap,
      color: 'from-yellow-500 to-orange-500',
      action: 'Execute automation workflow'
    },
    {
      id: 'report',
      name: 'Generate Report',
      icon: FileText,
      color: 'from-indigo-500 to-blue-500',
      action: 'Generate project report'
    },
    {
      id: 'team',
      name: 'Team Update',
      icon: Users,
      color: 'from-teal-500 to-cyan-500',
      action: 'Send team status update'
    },
    {
      id: 'backup',
      name: 'Backup Data',
      icon: Database,
      color: 'from-gray-500 to-slate-500',
      action: 'Backup project data'
    }
  ];

  return (
    <div className="bg-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-6">Quick Actions</h3>
      
      <div className="grid grid-cols-2 gap-4">
        {actions.map((action) => {
          const Icon = action.icon;
          
          return (
            <button
              key={action.id}
              onClick={() => onExecuteAction(action.action)}
              className="group relative bg-black/20 hover:bg-black/40 border border-gray-800/50 hover:border-gray-600/50 rounded-xl p-4 transition-all duration-200 hover:scale-[1.02]"
            >
              <div className={`w-10 h-10 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm font-medium text-white text-left">{action.name}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
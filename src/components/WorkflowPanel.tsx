import React from 'react';
import { Play, Pause, Settings as SettingsIcon, Plus } from 'lucide-react';

interface Workflow {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'scheduled';
  lastRun?: Date;
  nextRun?: Date;
  actions: number;
}

interface WorkflowPanelProps {
  workflows: Workflow[];
}

export default function WorkflowPanel({ workflows }: WorkflowPanelProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-500/20';
      case 'paused': return 'text-gray-400 bg-gray-500/20';
      case 'scheduled': return 'text-blue-400 bg-blue-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <div className="border-t border-gray-800/50 bg-black/80 backdrop-blur-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Workflow Automation</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all duration-200">
          <Plus className="w-4 h-4" />
          New Workflow
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {workflows.map((workflow) => (
          <div
            key={workflow.id}
            className="bg-gray-900/30 border border-gray-700/50 rounded-xl p-4 hover:border-gray-600/50 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-white">{workflow.name}</h4>
              <div className="flex items-center gap-2">
                <button className="p-1 rounded hover:bg-gray-700/50 transition-colors duration-200">
                  {workflow.status === 'active' ? (
                    <Pause className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Play className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                <button className="p-1 rounded hover:bg-gray-700/50 transition-colors duration-200">
                  <SettingsIcon className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Status</span>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(workflow.status)}`}>
                  {workflow.status}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Actions</span>
                <span className="text-sm text-white">{workflow.actions}</span>
              </div>

              {workflow.lastRun && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Last Run</span>
                  <span className="text-sm text-white">{formatTime(workflow.lastRun)}</span>
                </div>
              )}

              {workflow.nextRun && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Next Run</span>
                  <span className="text-sm text-cyan-400">{formatTime(workflow.nextRun)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
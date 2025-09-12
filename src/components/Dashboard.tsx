import React from 'react';
import MonitoringStatus from './MonitoringStatus';
import ActivityFeed from './ActivityFeed';
import QuickActions from './QuickActions';

interface Activity {
  id: string;
  type: 'email' | 'file' | 'app' | 'calendar' | 'browser' | 'workflow';
  action: string;
  timestamp: Date;
  status: 'completed' | 'pending' | 'suggested';
  details?: string;
}

interface Workflow {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'scheduled';
  lastRun?: Date;
  nextRun?: Date;
  actions: number;
}

interface DashboardProps {
  isMonitoring: boolean;
  idleTime: number;
  currentProject: string;
  activities: Activity[];
  workflows: Workflow[];
  onExecuteAction: (action: string) => void;
}

export default function Dashboard({ 
  isMonitoring, 
  idleTime, 
  currentProject, 
  activities, 
  workflows,
  onExecuteAction 
}: DashboardProps) {
  return (
    <div className="flex-1 p-8 space-y-8">
      {/* Monitoring Status */}
      <MonitoringStatus 
        isMonitoring={isMonitoring}
        idleTime={idleTime}
        currentProject={currentProject}
        activeWorkflows={workflows.filter(w => w.status === 'active').length}
      />

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <QuickActions onExecuteAction={onExecuteAction} />
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-2">
          <ActivityFeed activities={activities} />
        </div>
      </div>

      {/* Proactive Suggestions */}
      {idleTime > 5 && (
        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-cyan-400 mb-2">
                Inactivity Detected - Suggested Actions
              </h3>
              <p className="text-gray-300 mb-4">
                I've detected {idleTime} minutes of inactivity on {currentProject}. Here are some suggested actions:
              </p>
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => onExecuteAction('Save and backup current work')}
                  className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all duration-200"
                >
                  Save & Backup Work
                </button>
                <button 
                  onClick={() => onExecuteAction('Send project status update')}
                  className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all duration-200"
                >
                  Send Status Update
                </button>
                <button 
                  onClick={() => onExecuteAction('Schedule follow-up meeting')}
                  className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-all duration-200"
                >
                  Schedule Follow-up
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
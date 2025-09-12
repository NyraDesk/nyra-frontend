import React from 'react';
import { Mail, FolderOpen, Calendar, Globe, Zap, CheckCircle, Clock, AlertCircle, ChevronRight } from 'lucide-react';

interface Activity {
  id: string;
  type: 'email' | 'file' | 'app' | 'calendar' | 'browser' | 'workflow';
  action: string;
  timestamp: Date;
  status: 'completed' | 'pending' | 'suggested';
  details?: string;
}

interface ActivityFeedProps {
  activities: Activity[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'email': return Mail;
      case 'file': return FolderOpen;
      case 'calendar': return Calendar;
      case 'browser': return Globe;
      case 'workflow': return Zap;
      default: return Zap;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'pending': return Clock;
      case 'suggested': return AlertCircle;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'pending': return 'text-yellow-400';
      case 'suggested': return 'text-cyan-400';
      default: return 'text-gray-400';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white">Recent Actions</h3>
        <span className="text-sm text-gray-400">{activities.length} actions</span>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {activities.map((activity) => {
          const Icon = getIcon(activity.type);
          const StatusIcon = getStatusIcon(activity.status);
          const statusColor = getStatusColor(activity.status);

          return (
            <div
              key={activity.id}
              className="group bg-black/20 hover:bg-black/40 border border-gray-800/50 hover:border-gray-600/50 rounded-xl p-4 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-800/50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-gray-400" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusIcon className={`w-4 h-4 ${statusColor}`} />
                    <span className="text-sm font-medium text-white">{activity.action}</span>
                  </div>
                  
                  {activity.details && (
                    <p className="text-sm text-gray-400 mb-2">{activity.details}</p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{formatTime(activity.timestamp)}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      activity.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      activity.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      {activity.status}
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors duration-200" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
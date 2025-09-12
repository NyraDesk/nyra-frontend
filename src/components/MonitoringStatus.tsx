import React from 'react';
import { Activity, Cpu, Target, Clock } from 'lucide-react';

interface MonitoringStatusProps {
  isMonitoring: boolean;
  idleTime: number;
  currentProject: string;
  activeWorkflows: number;
}

export default function MonitoringStatus({ 
  isMonitoring, 
  idleTime, 
  currentProject, 
  activeWorkflows 
}: MonitoringStatusProps) {
  return (
    <div className="bg-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Active Monitoring</h2>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
          isMonitoring ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-sm font-medium">
            {isMonitoring ? 'ACTIVE' : 'PAUSED'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Current Project */}
        <div className="bg-black/20 rounded-xl p-4 border border-gray-800/50">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-cyan-400" />
            <span className="text-sm text-gray-400">Current Project</span>
          </div>
          <p className="text-lg font-semibold text-white">{currentProject}</p>
        </div>

        {/* Idle Time */}
        <div className="bg-black/20 rounded-xl p-4 border border-gray-800/50">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-gray-400">Idle Time</span>
          </div>
          <p className="text-lg font-semibold text-white">
            {idleTime}m
            {idleTime > 5 && <span className="text-orange-400 ml-2">⚠</span>}
          </p>
        </div>

        {/* Active Workflows */}
        <div className="bg-black/20 rounded-xl p-4 border border-gray-800/50">
          <div className="flex items-center gap-3 mb-2">
            <Cpu className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-400">Active Workflows</span>
          </div>
          <p className="text-lg font-semibold text-white">{activeWorkflows}</p>
        </div>

        {/* System Status */}
        <div className="bg-black/20 rounded-xl p-4 border border-gray-800/50">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-gray-400">System Status</span>
          </div>
          <p className="text-lg font-semibold text-green-400">Optimal</p>
        </div>
      </div>
    </div>
  );
}
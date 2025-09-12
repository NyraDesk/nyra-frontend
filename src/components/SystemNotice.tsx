import React from 'react';

interface SystemNoticeProps {
  type: 'success' | 'warning';
  icon?: React.ReactNode;
  text: string;
}

const SystemNotice: React.FC<SystemNoticeProps> = ({ type, icon, text }) => {
  const baseClasses = "inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium";
  
  const typeClasses = {
    success: "bg-green-100 text-green-800 border border-green-200",
    warning: "bg-yellow-100 text-yellow-800 border border-yellow-200"
  };

  const defaultIcons = {
    success: "📅",
    warning: "⚠️"
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`}>
      {icon || defaultIcons[type]}
      <span>{text}</span>
    </div>
  );
};

export default SystemNotice;

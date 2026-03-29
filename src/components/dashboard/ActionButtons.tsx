import React from 'react';
import { CheckCircle, Save } from 'lucide-react';

interface ActionButtonsProps {
  isUserOnDuty: boolean;
  role?: string;
  handleMarkAllOK: () => void;
  handleSaveChecklist: () => void;
  buttonText: string;
}

export default function ActionButtons({
  isUserOnDuty,
  role,
  handleMarkAllOK,
  handleSaveChecklist,
  buttonText
}: ActionButtonsProps) {
  if (!isUserOnDuty) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
      {/* Label Tooltips for Desktop - ADMIN ONLY */}
      {role === 'ADMIN' && (
        <button
          onClick={handleMarkAllOK}
          className="p-3 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-xl transition-all active:scale-90 flex items-center gap-2 pointer-events-auto group md:hover:pr-4 order-2"
          title="Đánh dấu tất cả OK (Dành cho Admin)"
        >
          <span className="hidden md:inline overflow-hidden max-w-0 group-hover:max-w-xs transition-all duration-300 font-bold text-sm whitespace-nowrap">
            {buttonText} OK (Admin)
          </span>
          <CheckCircle size={24} />
        </button>
      )}

      <button
        onClick={handleSaveChecklist}
        className="p-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-2xl transition-all active:scale-95 flex items-center gap-2 pointer-events-auto group md:hover:pr-5 order-3"
        title="Lưu & Báo cáo"
      >
        <span className="hidden md:inline overflow-hidden max-w-0 group-hover:max-w-xs transition-all duration-300 font-bold whitespace-nowrap border-r border-white/20 mr-1 pr-2">
          Lưu & Báo cáo
        </span>
        <Save size={28} />
      </button>
    </div>
  );
}

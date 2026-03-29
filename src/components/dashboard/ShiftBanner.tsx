import React from 'react';
import { AlertTriangle, X, UserCheck, Check, FileText, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import { SystemCategory, SystemCheck } from '@/lib/types';

interface ShiftBannerProps {
  isLastHourOfShift: boolean;
  showReminder: boolean;
  setShowReminder: (v: boolean) => void;
  isUserOnDuty: boolean;
  teamAssignedCategories: SystemCategory[];
  currentShiftType: 'DAY' | 'NIGHT';
  shiftDateStr: string;
  currentShiftAssignments: any[];
  systems: SystemCheck[];
  setIsHandoffModalOpen: (v: boolean) => void;
  handleStartNewShift: () => void;
  isEditMode: boolean;
}

export default function ShiftBanner({
  isLastHourOfShift,
  showReminder,
  setShowReminder,
  isUserOnDuty,
  teamAssignedCategories,
  currentShiftType,
  shiftDateStr,
  currentShiftAssignments,
  systems,
  setIsHandoffModalOpen,
  handleStartNewShift,
  isEditMode
}: ShiftBannerProps) {

  return (
    <>
      {isLastHourOfShift && showReminder && (
        <div className="mb-4 bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-600 rounded-full animate-bounce h-fit">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Nhắc nhở hoàn tất ca trực</h4>
              <p className="text-[11px] sm:text-xs text-amber-700 font-medium leading-tight">Vẫn còn một số hệ thống chưa được kiểm tra. Bạn hãy tranh thủ hoàn thành nốt trước khi hết ca nhé!</p>
            </div>
          </div>
          <button
            onClick={() => setShowReminder(false)}
            className="p-2 hover:bg-amber-100 text-amber-400 hover:text-amber-600 rounded-lg transition-colors flex-shrink-0"
            title="Đóng thông báo"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {isUserOnDuty && teamAssignedCategories.length > 0 && !isEditMode && (
        <div className="mb-4 bg-indigo-600 text-white p-4 rounded-lg shadow-md">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full">
              <div className="p-2 bg-white/20 rounded-full">
                <UserCheck size={24} />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold uppercase tracking-widest opacity-80 flex justify-between items-center">
                  <span>Đội trực: {currentShiftType === 'DAY' ? 'Ca Ngày (07:00 - 19:00)' : 'Ca Đêm (19:00 - 07:00)'}</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">Ngày: {shiftDateStr.split('-').reverse().join('/')}</span>
                </div>
                <div className="text-lg font-bold mb-1">
                  {currentShiftAssignments.map((a: any) => a.userName).join(' & ') || 'Chưa trực'}
                </div>
                <div className="text-[10px] font-medium opacity-90 border-t border-white/10 pt-1">
                  Phân công kiểm tra các nhóm:
                  <div className="flex flex-wrap gap-2 mt-1">
                    {teamAssignedCategories.map(cat => {
                      const catSystems = systems.filter(s => s.categoryId === cat.id);
                      const isDone = catSystems.length > 0 && catSystems.every(s => s.status && s.status !== 'NA');

                      return (
                        <button
                          key={cat.id}
                          onClick={() => {
                            const el = document.getElementById(`category-${cat.id}`);
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }}
                          className={clsx(
                            "text-xs px-2 py-1 rounded border font-bold transition-all active:scale-95 flex items-center gap-1 shadow-sm",
                            isDone
                              ? "bg-green-500 text-white border-green-400 hover:bg-green-400"
                              : "bg-white/20 text-white border-white/30 hover:bg-white/30"
                          )}
                        >
                          {isDone && <Check size={12} />}
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-left md:text-right w-full md:w-auto flex flex-col items-start md:items-end gap-2 mt-4 md:mt-0 pt-3 md:pt-0 border-t border-white/10 md:border-0">
              <span className="text-[11px] sm:text-xs font-medium opacity-70 italic">* Bạn và đồng đội hỗ trợ nhau kiểm tra các nhóm trên.</span>
              <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 w-full">
                <button
                  onClick={() => setIsHandoffModalOpen(true)}
                  className="bg-green-500 hover:bg-green-400 text-white px-3 py-2 sm:py-1.5 rounded-lg border border-green-400 text-sm font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-sm w-full sm:w-auto"
                >
                  <FileText size={16} /> Bàn giao ca (Zalo)
                </button>
                <button
                  onClick={handleStartNewShift}
                  className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 sm:py-1.5 rounded-lg border border-white/40 text-sm font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-sm w-full sm:w-auto"
                >
                  <RotateCcw size={16} /> Bắt đầu ca trực mới
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isUserOnDuty && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => alert('Chỉ nhân viên được phân công trong ca trực hiện tại mới được phép thao tác!')}
            className="bg-slate-200 text-slate-400 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm border border-slate-300 cursor-not-allowed"
            title="Bạn không được phân công trong ca trực này"
          >
            <RotateCcw size={18} /> Bắt đầu ca trực mới
          </button>
        </div>
      )}
    </>
  );
}

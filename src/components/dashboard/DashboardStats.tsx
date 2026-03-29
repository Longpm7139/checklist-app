import React from 'react';
import { ClipboardList, CheckCheck, AlertCircle, Wrench, AlertTriangle, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';

interface DashboardStatsProps {
  systems: any[];
  incidents: any[];
  tasks: any[];
  failedCategoryIds: string[];
  categories: any[];
}

export default function DashboardStats({ systems, incidents, tasks, failedCategoryIds, categories }: DashboardStatsProps) {
  const router = useRouter();
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider line-clamp-2 min-h-[1.5rem] sm:min-h-0">Tiến độ kiểm tra</h3>
            <div className="text-2xl font-bold text-slate-800 flex items-baseline gap-1">
              {Math.round((systems.filter(s => s.status && s.status !== 'NA').length / Math.max(systems.length, 1)) * 100) || 0}%
              <span className="text-sm font-normal text-slate-500">
                ({systems.filter(s => s.status && s.status !== 'NA').length}/{systems.length})
              </span>
            </div>
          </div>
          <div className={clsx(
            "p-2 rounded-lg transition-colors",
            systems.length > 0 && systems.every(s => s.status !== 'NA') ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
          )}>
            {systems.length > 0 && systems.every(s => s.status !== 'NA') ? <CheckCheck size={20} /> : <ClipboardList size={20} />}
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
          <div
            className={clsx("h-2.5 rounded-full transition-all duration-500",
              systems.length > 0 && systems.every(s => s.status !== 'NA') ? "bg-green-500" : "bg-blue-600"
            )}
            style={{ width: `${(systems.filter(s => s.status !== 'NA').length / Math.max(systems.length, 1)) * 100}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs font-medium">
          <span className="text-blue-600">Đã kiểm: {systems.filter(s => s.status !== 'NA').length}</span>
          <span className="text-slate-400">Chưa kiểm: {systems.filter(s => s.status === 'NA').length}</span>
        </div>
      </div>

      <div
        onClick={() => router.push('/incidents')}
        className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-red-300 transition-all active:scale-95 group"
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider group-hover:text-red-600 transition-colors line-clamp-2 min-h-[1.5rem] sm:min-h-0">Sự cố chờ xử lý</h3>
            <div className="text-2xl font-bold text-slate-800">
              {incidents.filter((i: any) => i.status === 'OPEN').length}
            </div>
          </div>
          <div className="p-2 bg-red-100 text-red-600 rounded-lg animate-pulse">
            <AlertCircle size={20} />
          </div>
        </div>
        <div className="mt-4 text-xs text-red-600 font-medium flex items-center gap-1">
          Cần khắc phục ngay! <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-0 group-hover:translate-x-1" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider line-clamp-2 min-h-[1.5rem] sm:min-h-0">Bảo trì định kỳ</h3>
            <div className="text-2xl font-bold text-slate-800">
              {tasks.filter((t) => t.status === 'PENDING').length}
            </div>
          </div>
          <div className={clsx("p-2 rounded-lg transition-colors", tasks.some(t => t.status === 'PENDING') ? "bg-cyan-100 text-cyan-600" : "bg-green-100 text-green-600")}>
            {tasks.some(t => t.status === 'PENDING') ? <Wrench size={20} /> : <CheckCheck size={20} />}
          </div>
        </div>
        <div className="mt-4 text-xs text-slate-400 font-medium">
          {tasks.some(t => t.status === 'PENDING') ? "Cần hoàn thành bảo dưỡng" : "Đã xong lịch bảo dưỡng"}
        </div>
      </div>

      <div
        onClick={() => router.push('/summary')}
        className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-amber-300 transition-all active:scale-95 group"
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider group-hover:text-amber-600 transition-colors line-clamp-2 min-h-[1.5rem] sm:min-h-0">Lỗi phát hiện hôm nay</h3>
            <div className="text-2xl font-bold text-slate-800">
              {systems.filter(s => s.status === 'NOK').length}
            </div>
          </div>
          <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
            <AlertCircle size={20} />
          </div>
        </div>
        <div className="mt-4 text-xs text-amber-600 font-medium flex items-center gap-1">
          Xem chi tiết & Gửi Zalo <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-0 group-hover:translate-x-1" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 col-span-2 md:col-span-1 lg:col-span-1">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-red-600 line-clamp-2 min-h-[1.5rem] sm:min-h-0">Nhóm hệ thống đang lỗi</h3>
            <div className="mt-2 flex flex-wrap gap-1">
              {failedCategoryIds.length > 0 ? (
                failedCategoryIds.map(id => {
                  const cat = categories.find(c => c.id === id);
                  return (
                    <span key={id} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-bold border border-red-200 whitespace-nowrap">
                      {cat?.name || id}
                    </span>
                  );
                })
              ) : (
                <span className="text-xs text-green-600 font-medium italic">Tất cả hệ thống OK</span>
              )}
            </div>
          </div>
          <div className={clsx("p-2 rounded-lg transition-colors", failedCategoryIds.length > 0 ? "bg-red-100 text-red-600 animate-pulse" : "bg-green-100 text-green-600")}>
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>
    </div>
  );
}

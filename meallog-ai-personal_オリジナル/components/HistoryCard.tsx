import React from 'react';
import { MealLog } from '../types';
import { Trash2, Clock, Zap, Utensils } from 'lucide-react';

interface HistoryCardProps {
  log: MealLog;
  onDelete: (id: string) => void;
  onClick: (log: MealLog) => void;
}

export const HistoryCard: React.FC<HistoryCardProps> = ({ log, onDelete, onClick }) => {
  const timeStr = new Date(log.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

  return (
    <div 
      onClick={() => onClick(log)}
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-4 transition-all hover:shadow-md cursor-pointer active:scale-[0.98]"
    >
      <div className="w-12 h-12 rounded-xl bg-sky-50 flex-shrink-0 flex items-center justify-center text-sky-500 relative">
        <Utensils size={24} />
        {log.is_snack && (
            <div className="absolute -top-1 -right-1 bg-yellow-400 text-gray-900 text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                おやつ
            </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{log.item_name}</h3>
            <span className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap ml-2">
                <Clock size={10} /> {timeStr}
            </span>
          </div>
          <p className="text-xs text-sky-500 font-bold mt-1 flex items-center gap-1">
            <Zap size={10} className="fill-sky-500" /> {Math.round(log.calories)} kcal
          </p>
          <div className="flex gap-2 mt-1 text-[10px] text-gray-500">
            <span>P: {Math.round(log.p * 10) / 10}g</span>
            <span>F: {Math.round(log.f * 10) / 10}g</span>
            <span>C: {Math.round(log.c * 10) / 10}g</span>
          </div>
        </div>
        
        {log.advice && (
            <div className="mt-2 text-xs bg-sky-50 p-2 rounded-lg text-sky-800 border border-sky-100 italic truncate">
                {log.advice}
            </div>
        )}
      </div>

      <button 
        onClick={(e) => {
            e.stopPropagation(); // Prevent opening the detail modal
            onDelete(log.id);
        }}
        className="self-start p-1.5 text-gray-300 hover:text-red-500 transition-colors z-10"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};
import React from 'react';
import { Calendar } from 'lucide-react';
import { DateRangeOption } from '../types';

interface Props {
  range: DateRangeOption;
  setRange: (r: DateRangeOption) => void;
  customStart: string;
  setCustomStart: (d: string) => void;
  customEnd: string;
  setCustomEnd: (d: string) => void;
  hideAllOption?: boolean;
}

export const filterDataByDate = (data: any[], range: DateRangeOption, start: string, end: string, dateField = 'date') => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  return data.filter(item => {
    const itemDate = item[dateField];
    if (!itemDate) return false;

    if (range === 'ALL') return true;
    if (range === 'CUSTOM') {
       return itemDate >= start && itemDate <= end;
    }
    if (range === 'TODAY') {
       return itemDate === todayStr;
    }

    const d = new Date(itemDate);
    const cutoff = new Date();
    
    if (range === 'WEEK') cutoff.setDate(now.getDate() - 7);
    if (range === 'MONTH') cutoff.setMonth(now.getMonth() - 1);
    if (range === 'YEAR') cutoff.setFullYear(now.getFullYear() - 1);

    return d >= cutoff;
  });
};

const DateFilterBar: React.FC<Props> = ({ 
  range, setRange, customStart, setCustomStart, customEnd, setCustomEnd, hideAllOption = false
}) => {
  const options = ['TODAY', 'WEEK', 'MONTH', 'YEAR', 'ALL', 'CUSTOM'] as const;
  
  return (
    <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 px-2 text-slate-500">
        <Calendar className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-wider">Timeframe:</span>
      </div>
      
      <div className="flex gap-1 bg-slate-100 p-1 rounded-md">
         {options.map((opt) => {
           if (hideAllOption && opt === 'ALL') return null;
           return (
             <button
               key={opt}
               onClick={() => setRange(opt)}
               className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                 range === opt 
                   ? 'bg-white text-indigo-600 shadow-sm' 
                   : 'text-slate-500 hover:text-slate-700'
               }`}
             >
               {opt === 'TODAY' ? 'Today' : 
                opt === 'ALL' ? 'All Time' : 
                opt.charAt(0) + opt.slice(1).toLowerCase()}
             </button>
           );
         })}
      </div>

      {range === 'CUSTOM' && (
        <div className="flex items-center gap-2 ml-2 animate-in fade-in slide-in-from-left-2">
           <input 
             type="date" 
             value={customStart}
             onChange={(e) => setCustomStart(e.target.value)}
             className="text-xs border border-slate-300 rounded px-2 py-1"
           />
           <span className="text-slate-400 text-xs">-</span>
           <input 
             type="date" 
             value={customEnd}
             onChange={(e) => setCustomEnd(e.target.value)}
             className="text-xs border border-slate-300 rounded px-2 py-1"
           />
        </div>
      )}
    </div>
  );
};

export default DateFilterBar;

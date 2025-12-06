import React from 'react';
import { Download, Printer, Calendar } from 'lucide-react';
import { downloadCSV, printData, filterByDateRange } from '../services/exportUtils';

interface Props {
  data: any[];
  title: string;
  dateField?: string; // Field name to filter by (default 'date')
}

const ExportToolbar: React.FC<Props> = ({ data, title, dateField = 'date' }) => {
  const [range, setRange] = React.useState<'ALL' | 'WEEK' | 'MONTH' | 'YEAR'>('ALL');

  const getFilteredData = () => {
    return filterByDateRange(data, dateField, range);
  };

  const handleExportCSV = () => {
    downloadCSV(getFilteredData(), title.replace(/\s+/g, '_'));
  };

  const handlePrint = () => {
    printData(title, getFilteredData());
  };

  return (
    <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm mb-4">
      <div className="flex items-center gap-2 px-2 border-r border-slate-200 mr-2">
        <Calendar className="w-4 h-4 text-slate-400" />
        <select 
          value={range} 
          onChange={(e) => setRange(e.target.value as any)}
          className="text-sm border-none focus:ring-0 text-slate-600 bg-transparent font-medium cursor-pointer"
        >
          <option value="ALL">All Time</option>
          <option value="WEEK">Last 7 Days</option>
          <option value="MONTH">Last 30 Days</option>
          <option value="YEAR">Last 1 Year</option>
        </select>
      </div>

      <div className="flex-1"></div>

      <button 
        onClick={handleExportCSV}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Excel / CSV
      </button>
      <button 
        onClick={handlePrint}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors"
      >
        <Printer className="w-3.5 h-3.5" />
        Print / PDF
      </button>
    </div>
  );
};

export default ExportToolbar;

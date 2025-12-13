import React from 'react';
import { Download, Printer } from 'lucide-react';
import { downloadCSV, printData } from '../services/exportUtils';

interface Props {
  data: any[];
  title: string;
  dateRangeText: string; // Passed from parent to include in header
}

const ExportToolbar: React.FC<Props> = ({ data, title, dateRangeText }) => {
  
  const handleExportCSV = () => {
    downloadCSV(data, title.replace(/\s+/g, '_'), title, dateRangeText);
  };

  const handlePrint = () => {
    printData(title, data, dateRangeText);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button 
        onClick={handleExportCSV}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors border border-slate-200"
      >
        <Download className="w-3.5 h-3.5" />
        Excel / CSV
      </button>
      <button 
        onClick={handlePrint}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors border border-slate-200"
      >
        <Printer className="w-3.5 h-3.5" />
        Print / PDF
      </button>
    </div>
  );
};

export default ExportToolbar;
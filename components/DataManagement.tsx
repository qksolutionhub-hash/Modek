import React, { useRef, useState } from 'react';
import { db } from '../services/db';
import { Download, Upload, CheckCircle, AlertCircle, Database, FileSpreadsheet } from 'lucide-react';
import { downloadCSV } from '../services/exportUtils';

const DataManagement: React.FC = () => {
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const importRef = useRef<{ type: string, input: HTMLInputElement | null }>({ type: '', input: null });

  const handleDownloadTable = async (table: 'CashFlow' | 'Invoices' | 'SheetTransactions') => {
    try {
      let data: any[] = [];
      if (table === 'CashFlow') data = await db.getCashFlow();
      if (table === 'Invoices') data = await db.getInvoices();
      if (table === 'SheetTransactions') data = await db.getSheetTransactions();

      downloadCSV(data, `${table}_Backup`, `${table} Backup`, new Date().toLocaleDateString());
      setMessage({ type: 'success', text: `${table} downloaded for Excel editing.` });
    } catch (e) {
      setMessage({ type: 'error', text: 'Download failed.' });
    }
  };

  const triggerImport = (type: 'CashFlow' | 'Invoices' | 'SheetTransactions') => {
    importRef.current.type = type;
    importRef.current.input?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvText = event.target?.result as string;
      if (csvText) {
        try {
           const count = await db.importCSV(importRef.current.type as any, csvText);
           setMessage({ type: 'success', text: `Successfully imported ${count} records to ${importRef.current.type}. Reloading...` });
           setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
           setMessage({ type: 'error', text: 'Failed to parse CSV. Ensure standard format.' });
        }
      }
    };
    reader.readAsText(file);
    // Reset
    e.target.value = '';
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
           <div className="bg-indigo-100 p-2 rounded-lg">
             <Database className="w-6 h-6 text-indigo-600" />
           </div>
           <div>
             <h2 className="text-lg font-bold text-slate-800">Data Management</h2>
             <p className="text-sm text-slate-500">Edit data in Excel and restore it here.</p>
           </div>
        </div>
        
        <div className="p-8 space-y-8">
           {message && (
             <div className={`p-4 rounded-lg flex items-center gap-2 ${
               message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
             }`}>
               {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
               {message.text}
             </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Cash Flow */}
              <div className="border rounded-xl p-6 flex flex-col items-center text-center space-y-4 hover:border-indigo-300 transition-colors bg-slate-50/50">
                 <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <FileSpreadsheet className="w-5 h-5" />
                 </div>
                 <h3 className="font-bold text-slate-800">Cash Flow</h3>
                 <div className="flex flex-col w-full gap-2">
                    <button onClick={() => handleDownloadTable('CashFlow')} className="py-2 bg-white border border-slate-300 rounded text-xs font-bold hover:bg-slate-50">Download CSV</button>
                    <button onClick={() => triggerImport('CashFlow')} className="py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700">Upload Edited CSV</button>
                 </div>
              </div>

              {/* Invoices */}
              <div className="border rounded-xl p-6 flex flex-col items-center text-center space-y-4 hover:border-indigo-300 transition-colors bg-slate-50/50">
                 <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <FileSpreadsheet className="w-5 h-5" />
                 </div>
                 <h3 className="font-bold text-slate-800">Invoices</h3>
                 <div className="flex flex-col w-full gap-2">
                    <button onClick={() => handleDownloadTable('Invoices')} className="py-2 bg-white border border-slate-300 rounded text-xs font-bold hover:bg-slate-50">Download CSV</button>
                    <button onClick={() => triggerImport('Invoices')} className="py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700">Upload Edited CSV</button>
                 </div>
              </div>

              {/* Sheets */}
              <div className="border rounded-xl p-6 flex flex-col items-center text-center space-y-4 hover:border-indigo-300 transition-colors bg-slate-50/50">
                 <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                    <FileSpreadsheet className="w-5 h-5" />
                 </div>
                 <h3 className="font-bold text-slate-800">Inventory</h3>
                 <div className="flex flex-col w-full gap-2">
                    <button onClick={() => handleDownloadTable('SheetTransactions')} className="py-2 bg-white border border-slate-300 rounded text-xs font-bold hover:bg-slate-50">Download CSV</button>
                    <button onClick={() => triggerImport('SheetTransactions')} className="py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700">Upload Edited CSV</button>
                 </div>
              </div>
           </div>

           {/* Hidden Input for Import */}
           <input 
             type="file" 
             ref={(el) => importRef.current.input = el} 
             onChange={handleImportFile} 
             accept=".csv" 
             className="hidden" 
           />

           <div className="bg-slate-50 p-4 rounded-lg text-xs text-slate-500 leading-relaxed border border-slate-200">
              <strong>How to Edit Data in Excel:</strong><br/>
              1. Download the CSV for the section you want to modify.<br/>
              2. Open it in Excel, Google Sheets, or any spreadsheet editor.<br/>
              3. Modify rows or add new ones. <strong>Do not change column headers.</strong><br/>
              4. Save as CSV (Comma Delimited) and Upload back here to update the system.
           </div>
        </div>
      </div>
    </div>
  );
};

export default DataManagement;
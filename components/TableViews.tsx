import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Eye
} from 'lucide-react';
import { CashFlowEntry, InvoiceEntry, TableName, DateRangeOption } from '../types';
import ExportToolbar from './ExportToolbar';
import InvoiceTemplate from './InvoiceTemplate';
import DateFilterBar, { filterDataByDate } from './DateFilterBar';

interface TableWrapperProps {
  title: string;
  onAdd: () => void;
  children: React.ReactNode;
  canAdd: boolean;
  dataForExport?: any[];
  // Filter Props
  range: DateRangeOption;
  setRange: (r: DateRangeOption) => void;
  start: string;
  setStart: (d: string) => void;
  end: string;
  setEnd: (d: string) => void;
  hideAllOption?: boolean;
}

const TableWrapper: React.FC<TableWrapperProps> = ({ 
  title, onAdd, children, canAdd, dataForExport,
  range, setRange, start, setStart, end, setEnd, hideAllOption
}) => (
  <div className="flex flex-col h-full space-y-4">
    {/* Controls Bar */}
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <DateFilterBar 
            range={range} setRange={setRange}
            customStart={start} setCustomStart={setStart}
            customEnd={end} setCustomEnd={setEnd}
            hideAllOption={hideAllOption}
        />
        {dataForExport && <ExportToolbar data={dataForExport} title={title} />}
    </div>

    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <div className="flex gap-2">
          <button className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200">
            <Search className="w-4 h-4" />
          </button>
          {canAdd && (
            <button 
              onClick={onAdd}
              className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add New
            </button>
          )}
        </div>
      </div>
      <div className="overflow-auto flex-1 p-0">
        {children}
      </div>
    </div>
  </div>
);

// --- Specific Tables ---

export const CashFlowTable: React.FC<{ data: CashFlowEntry[] }> = ({ data }) => (
  <table className="w-full text-sm text-left">
    <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0">
      <tr>
        <th className="p-4">Date</th>
        <th className="p-4">Description</th>
        <th className="p-4">Type</th>
        <th className="p-4 text-right">Amount</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      {data.map((row) => (
        <tr key={row.id} className="hover:bg-slate-50 transition-colors">
          <td className="p-4 text-slate-600">{row.date}</td>
          <td className="p-4 font-medium text-slate-800">{row.description}</td>
          <td className="p-4">
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
              row.type === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {row.type}
            </span>
          </td>
          <td className={`p-4 text-right font-mono font-medium ${
             row.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
          }`}>
            {row.type === 'INCOME' ? '+' : '-'}${row.amount.toLocaleString()}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

export const InvoicesTable: React.FC<{ data: InvoiceEntry[] }> = ({ data }) => {
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceEntry | null>(null);

  return (
    <>
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0">
          <tr>
            <th className="p-4">Invoice #</th>
            <th className="p-4">Date</th>
            <th className="p-4">Customer</th>
            <th className="p-4 text-right">Amount</th>
            <th className="p-4">Status</th>
            <th className="p-4 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50">
              <td className="p-4 font-mono text-slate-500">{row.id}</td>
              <td className="p-4 text-slate-600">{row.date}</td>
              <td className="p-4 font-medium text-slate-800">{row.customerName}</td>
              <td className="p-4 text-right font-mono">${row.amount.toLocaleString()}</td>
              <td className="p-4">
                 <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  row.status === 'PAID' ? 'bg-green-100 text-green-700' : 
                  row.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                }`}>
                  {row.status}
                </span>
              </td>
              <td className="p-4 text-center">
                <button 
                  onClick={() => setSelectedInvoice(row)}
                  className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-full transition-colors"
                  title="View/Print Invoice"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedInvoice && (
        <InvoiceTemplate 
          invoice={selectedInvoice} 
          onClose={() => setSelectedInvoice(null)} 
        />
      )}
    </>
  );
};

export const ViewContainer: React.FC<{
  title: string;
  tableName: TableName;
  data: any[];
  onAdd: (data: any) => void;
  canAdd: boolean;
  initialOpenAdd?: boolean;
}> = ({ title, tableName, data, onAdd, canAdd, initialOpenAdd }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({ type: 'INCOME' }); // Default type
  
  // Local Filter State
  const [range, setRange] = useState<DateRangeOption>('TODAY');
  const [start, setStart] = useState(new Date().toISOString().split('T')[0]);
  const [end, setEnd] = useState(new Date().toISOString().split('T')[0]);

  // Check for auto-open
  useEffect(() => {
    if (initialOpenAdd) {
        setIsModalOpen(true);
        setFormData({ type: 'INCOME' }); // Ensure default is set on open
    }
  }, [initialOpenAdd]);

  const filteredData = filterDataByDate(data, range, start, end);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    setIsModalOpen(false);
    setFormData({ type: 'INCOME' });
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="h-full flex flex-col p-6">
      <TableWrapper 
        title={title} 
        onAdd={() => setIsModalOpen(true)} 
        canAdd={canAdd} 
        dataForExport={filteredData}
        range={range} setRange={setRange}
        start={start} setStart={setStart}
        end={end} setEnd={setEnd}
        hideAllOption={true}
      >
        {tableName === 'CashFlow' && <CashFlowTable data={filteredData} />}
        {tableName === 'Invoices' && <InvoicesTable data={filteredData} />}
      </TableWrapper>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Add {title} Entry</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {tableName === 'CashFlow' && (
                <>
                  <input required type="date" className="w-full border p-2 rounded" onChange={e => handleChange('date', e.target.value)} />
                  <input required placeholder="Description" className="w-full border p-2 rounded" onChange={e => handleChange('description', e.target.value)} />
                  
                  {/* Replaced Dropdown with List/Buttons */}
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      type="button" 
                      onClick={() => handleChange('type', 'INCOME')}
                      className={`p-2 rounded border text-center font-bold transition-colors ${
                        formData.type === 'INCOME' 
                        ? 'bg-green-100 border-green-500 text-green-700' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Income
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleChange('type', 'EXPENSE')}
                      className={`p-2 rounded border text-center font-bold transition-colors ${
                        formData.type === 'EXPENSE' 
                        ? 'bg-red-100 border-red-500 text-red-700' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Expense
                    </button>
                  </div>

                  <input required type="number" placeholder="Amount" className="w-full border p-2 rounded" onChange={e => handleChange('amount', Number(e.target.value))} />
                </>
              )}
              {tableName === 'Invoices' && (
                  <>
                  <input required placeholder="Invoice #" className="w-full border p-2 rounded" onChange={e => handleChange('id', e.target.value)} />
                  <input required type="date" className="w-full border p-2 rounded" onChange={e => handleChange('date', e.target.value)} />
                  <input required placeholder="Customer Name" className="w-full border p-2 rounded" onChange={e => handleChange('customerName', e.target.value)} />
                  <input required type="number" placeholder="Amount" className="w-full border p-2 rounded" onChange={e => handleChange('amount', Number(e.target.value))} />
                   <select className="w-full border p-2 rounded" onChange={e => handleChange('status', e.target.value)}>
                    <option value="PENDING">Pending</option>
                    <option value="PAID">Paid</option>
                    <option value="OVERDUE">Overdue</option>
                  </select>
                </>
              )}
              
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

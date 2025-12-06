import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Eye,
  Trash2
} from 'lucide-react';
import { CashFlowEntry, InvoiceEntry, InvoiceItem, TableName, DateRangeOption } from '../types';
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
  search: string;
  setSearch: (s: string) => void;
}

const TableWrapper: React.FC<TableWrapperProps> = ({ 
  title, onAdd, children, canAdd, dataForExport,
  range, setRange, start, setStart, end, setEnd,
  search, setSearch
}) => (
  <div className="flex flex-col h-full space-y-4">
    {/* Controls Bar */}
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <DateFilterBar 
            range={range} setRange={setRange}
            customStart={start} setCustomStart={setStart}
            customEnd={end} setCustomEnd={setEnd}
        />
        {dataForExport && <ExportToolbar data={dataForExport} title={title} />}
    </div>

    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1">
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        
        <div className="flex items-center gap-2 flex-1 w-full md:w-auto justify-end">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-64"
            />
          </div>
          
          {canAdd && (
            <button 
              onClick={onAdd}
              className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap"
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
            <th className="p-4">Type</th>
            <th className="p-4 text-right">Total Amount</th>
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
              <td className="p-4">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  row.type === 'RENT' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {row.type}
                </span>
              </td>
              <td className="p-4 text-right font-mono font-bold">${row.amount.toLocaleString()}</td>
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
  const [formData, setFormData] = useState<any>({ type: 'INCOME' }); 
  
  // Invoice Specific Form State
  const [invItems, setInvItems] = useState<InvoiceItem[]>([{ description: '', unit: 'pcs', unitPrice: 0, quantity: 1, total: 0 }]);
  const [invCustomer, setInvCustomer] = useState('');
  const [invType, setInvType] = useState<'SALE' | 'RENT' | 'SERVICE'>('SALE');
  const [invPendingBalance, setInvPendingBalance] = useState(0);

  // Filter & Search State
  const [range, setRange] = useState<DateRangeOption>('TODAY');
  const [start, setStart] = useState(new Date().toISOString().split('T')[0]);
  const [end, setEnd] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');

  // Check for auto-open
  useEffect(() => {
    if (initialOpenAdd) {
        setIsModalOpen(true);
        setFormData({ type: 'INCOME' });
    }
  }, [initialOpenAdd]);

  // Calculate Pending Balance when customer changes (Invoice Mode)
  useEffect(() => {
    if (tableName === 'Invoices' && invCustomer) {
       const customerInvoices = data.filter(i => 
         (i as InvoiceEntry).customerName?.toLowerCase() === invCustomer.toLowerCase() && 
         (i as InvoiceEntry).status !== 'PAID'
       );
       const pending = customerInvoices.reduce((sum, i) => sum + i.amount, 0);
       setInvPendingBalance(pending);
    } else {
       setInvPendingBalance(0);
    }
  }, [invCustomer, data, tableName]);

  // Filter Data Logic
  const processedData = useMemo(() => {
    let filtered = filterDataByDate(data, range, start, end);
    
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(item => {
        // Simple generic object search
        return Object.values(item).some(val => 
          String(val).toLowerCase().includes(q)
        );
      });
    }
    return filtered;
  }, [data, range, start, end, search]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (tableName === 'Invoices') {
       const totalAmount = invItems.reduce((acc, item) => acc + item.total, 0);
       onAdd({
         ...formData,
         customerName: invCustomer,
         type: invType,
         items: invItems,
         amount: totalAmount,
         status: formData.status || 'PENDING'
       });
       // Reset Invoice Form
       setInvItems([{ description: '', unit: 'pcs', unitPrice: 0, quantity: 1, total: 0 }]);
       setInvCustomer('');
       setInvType('SALE');
    } else {
       onAdd(formData);
    }

    setIsModalOpen(false);
    setFormData({ type: 'INCOME' });
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  // Invoice Line Item Handlers
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
     const newItems = [...invItems];
     const item = { ...newItems[index], [field]: value };
     
     // Auto calc total
     if (field === 'unitPrice' || field === 'quantity') {
        item.total = Number(item.unitPrice) * Number(item.quantity);
     }
     
     newItems[index] = item;
     setInvItems(newItems);
  };

  const addItemRow = () => {
    setInvItems([...invItems, { description: '', unit: 'pcs', unitPrice: 0, quantity: 1, total: 0 }]);
  };

  const removeItemRow = (index: number) => {
    const newItems = [...invItems];
    newItems.splice(index, 1);
    setInvItems(newItems);
  };

  const calculateInvoiceTotal = () => invItems.reduce((acc, i) => acc + i.total, 0);

  return (
    <div className="h-full flex flex-col p-6">
      <TableWrapper 
        title={title} 
        onAdd={() => setIsModalOpen(true)} 
        canAdd={canAdd} 
        dataForExport={processedData}
        range={range} setRange={setRange}
        start={start} setStart={setStart}
        end={end} setEnd={setEnd}
        search={search} setSearch={setSearch}
      >
        {tableName === 'CashFlow' && <CashFlowTable data={processedData} />}
        {tableName === 'Invoices' && <InvoicesTable data={processedData} />}
      </TableWrapper>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-xl shadow-xl w-full p-6 max-h-[90vh] overflow-auto ${tableName === 'Invoices' ? 'max-w-4xl' : 'max-w-md'}`}>
            <h2 className="text-xl font-bold mb-4">Add {title} Entry</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* --- CASH FLOW FORM --- */}
              {tableName === 'CashFlow' && (
                <>
                  <input required type="date" className="w-full border p-2 rounded" onChange={e => handleChange('date', e.target.value)} />
                  <input required placeholder="Description" className="w-full border p-2 rounded" onChange={e => handleChange('description', e.target.value)} />
                  
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

              {/* --- INVOICE FORM --- */}
              {tableName === 'Invoices' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input required placeholder="Invoice #" className="w-full border p-2 rounded" onChange={e => handleChange('id', e.target.value)} />
                    <input required type="date" className="w-full border p-2 rounded" onChange={e => handleChange('date', e.target.value)} />
                    <select 
                      className="w-full border p-2 rounded" 
                      value={invType} 
                      onChange={e => setInvType(e.target.value as any)}
                    >
                      <option value="SALE">Sale</option>
                      <option value="RENT">Rent</option>
                      <option value="SERVICE">Service</option>
                    </select>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4">
                     <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Customer</label>
                        <input 
                          required 
                          placeholder="Customer Name" 
                          className="w-full border p-2 rounded" 
                          value={invCustomer}
                          onChange={e => setInvCustomer(e.target.value)} 
                        />
                     </div>
                     <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                        <select className="w-full border p-2 rounded" onChange={e => handleChange('status', e.target.value)}>
                          <option value="PENDING">Pending</option>
                          <option value="PAID">Paid</option>
                          <option value="OVERDUE">Overdue</option>
                        </select>
                     </div>
                  </div>

                  {invPendingBalance > 0 && (
                     <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex justify-between items-center">
                        <span className="text-sm font-medium">Customer Pending Balance:</span>
                        <span className="font-bold text-lg">${invPendingBalance.toLocaleString()}</span>
                     </div>
                  )}

                  <div className="border-t border-slate-200 pt-4">
                     <h3 className="text-sm font-bold text-slate-700 uppercase mb-2">Line Items</h3>
                     <div className="space-y-2">
                        {/* Header Row */}
                        <div className="flex gap-2 text-xs font-bold text-slate-500 uppercase px-1">
                           <div className="flex-[3]">Description</div>
                           <div className="flex-1">Unit</div>
                           <div className="flex-1">Price</div>
                           <div className="flex-1">Qty</div>
                           <div className="flex-1 text-right">Total</div>
                           <div className="w-8"></div>
                        </div>

                        {invItems.map((item, idx) => (
                           <div key={idx} className="flex gap-2 items-start">
                              <input 
                                className="flex-[3] border p-2 rounded text-sm" 
                                placeholder="Item or Service"
                                value={item.description}
                                onChange={e => handleItemChange(idx, 'description', e.target.value)}
                                required
                              />
                              <input 
                                className="flex-1 border p-2 rounded text-sm" 
                                placeholder="Unit"
                                value={item.unit}
                                onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                              />
                              <input 
                                type="number"
                                className="flex-1 border p-2 rounded text-sm" 
                                placeholder="Price"
                                value={item.unitPrice}
                                onChange={e => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                                required
                              />
                              <input 
                                type="number"
                                className="flex-1 border p-2 rounded text-sm" 
                                placeholder="Qty"
                                value={item.quantity}
                                onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                                required
                              />
                              <div className="flex-1 border p-2 rounded bg-slate-50 text-right font-mono text-sm font-bold">
                                 {item.total.toLocaleString()}
                              </div>
                              <div className="w-8 flex items-center justify-center">
                                 {invItems.length > 1 && (
                                   <button type="button" onClick={() => removeItemRow(idx)} className="text-red-400 hover:text-red-600">
                                      <Trash2 className="w-4 h-4" />
                                   </button>
                                 )}
                              </div>
                           </div>
                        ))}
                     </div>
                     <button type="button" onClick={addItemRow} className="mt-2 text-sm text-indigo-600 font-medium flex items-center gap-1 hover:text-indigo-800">
                        <Plus className="w-4 h-4" /> Add Item
                     </button>
                  </div>

                  <div className="flex justify-end items-center gap-4 pt-4 border-t border-slate-200">
                     <span className="text-slate-500 font-medium">Grand Total:</span>
                     <span className="text-2xl font-bold text-slate-900">${calculateInvoiceTotal().toLocaleString()}</span>
                  </div>
                </div>
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
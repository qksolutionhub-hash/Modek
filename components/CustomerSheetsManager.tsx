import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  PackagePlus, 
  Scissors, 
  Truck, 
  ChevronRight, 
  ArrowLeft, 
  Users, 
  Plus, 
  Trash2, 
  ClipboardCheck, 
  Search, 
  ArrowUpDown, 
  Pencil,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { SheetTransaction, SheetActionType, ProcessingStatus, StockCategory, DateRangeOption } from '../types';
import ExportToolbar from './ExportToolbar';
import DateFilterBar, { filterDataByDate } from './DateFilterBar';

interface Props {
  transactions: SheetTransaction[];
  onAddTransaction: (data: Partial<SheetTransaction>) => void;
  onUpdateTransaction?: (id: string, data: Partial<SheetTransaction>) => void;
  onDeleteTransaction?: (id: string) => void;
  onDeleteCustomer?: (customerName: string) => void;
  initialAction?: SheetActionType | null;
}

// Aggregated Customer View Data Shape
interface CustomerSummary {
  customerName: string;
  totalReceived: number;
  totalCut: number;
  balanceRaw: number;
  totalReturned: number;
  totalBalance: number;
}

// Detailed Stock Item for a specific customer
interface StockItem {
  key: string;
  code: string;
  type: string;
  totalReceived: number;
  totalProcessed: number;
  returnedRaw: number;
  returnedCut: number;
  wastageRaw: number;
  wastageCut: number;
  balanceRaw: number;
  balanceCut: number;
  totalOnSite: number;
}

// Helper to aggregate stock per customer
const calculateCustomerSummaries = (transactions: SheetTransaction[]): CustomerSummary[] => {
  const map: Record<string, CustomerSummary> = {};

  transactions.forEach(t => {
    if (!map[t.customerName]) {
      map[t.customerName] = { 
        customerName: t.customerName, 
        totalReceived: 0, 
        totalCut: 0,
        balanceRaw: 0, 
        totalReturned: 0,
        totalBalance: 0 
      };
    }
    const c = map[t.customerName];
    if (t.action === 'RECEIVE') {
      c.totalReceived += t.quantity;
      c.balanceRaw += t.quantity;
    } else if (t.action === 'PROCESS') {
      const source = t.sourceCategory || 'RAW';
      if (source === 'RAW') {
        c.balanceRaw -= t.quantity;
        c.totalCut += t.quantity; // Processed means Cut
      }
    } else if (t.action === 'RETURN') {
      c.totalReturned += t.quantity;
      if (t.stockCategory === 'CUT') {
        c.totalCut -= t.quantity; // Remove from cut pool if returned
      } else {
        c.balanceRaw -= t.quantity; // Remove from raw pool
      }
    } else if (t.action === 'WASTAGE') {
        if (t.sourceCategory === 'CUT') {
             c.totalCut -= t.quantity;
        } else {
             c.balanceRaw -= t.quantity;
        }
    }
    
    // Balance Logic: Raw Balance is tracked directly. Cut items are considered in "Total Cut" until returned. 
    // "Current Balance" usually means Total On Site (Raw + Cut).
    c.totalBalance = c.balanceRaw + c.totalCut; // Simplifying: Cut Sheets are still "With us" until returned
  });

  return Object.values(map);
};

// Helper to get detailed stock items for a specific customer
const getCustomerStock = (transactions: SheetTransaction[], customerName: string): StockItem[] => {
  const stock: Record<string, StockItem> = {};
  
  transactions
    .filter(t => t.customerName === customerName)
    .forEach(t => {
      const key = `${t.sheetCode}-${t.sheetType}`;
      if (!stock[key]) {
        stock[key] = {
          key,
          code: t.sheetCode,
          type: t.sheetType,
          totalReceived: 0,
          totalProcessed: 0,
          returnedRaw: 0,
          returnedCut: 0,
          wastageRaw: 0,
          wastageCut: 0,
          balanceRaw: 0,
          balanceCut: 0,
          totalOnSite: 0
        };
      }
      const item = stock[key];
      
      if (t.action === 'RECEIVE') {
        item.totalReceived += t.quantity;
      } else if (t.action === 'PROCESS') {
        const source = t.sourceCategory || 'RAW';
        if (source === 'RAW') {
          item.totalProcessed += t.quantity;
        }
      } else if (t.action === 'RETURN') {
        if (t.stockCategory === 'CUT') item.returnedCut += t.quantity;
        else item.returnedRaw += t.quantity;
      } else if (t.action === 'WASTAGE') {
          if (t.sourceCategory === 'CUT') item.wastageCut += t.quantity;
          else item.wastageRaw += t.quantity;
      }
    });

  return Object.values(stock).map(item => {
    const balanceRaw = item.totalReceived - item.totalProcessed - item.returnedRaw - item.wastageRaw;
    const balanceCut = item.totalProcessed - item.returnedCut - item.wastageCut;
    return {
      ...item,
      balanceRaw: Math.max(0, balanceRaw),
      balanceCut: Math.max(0, balanceCut),
      totalOnSite: Math.max(0, balanceRaw + balanceCut)
    };
  });
};

const CustomerSheetsManager: React.FC<Props> = ({ transactions, onAddTransaction, onUpdateTransaction, onDeleteTransaction, onDeleteCustomer, initialAction }) => {
  // Navigation State
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(() => {
    return localStorage.getItem('WM_SELECTED_CUSTOMER') || null;
  });

  useEffect(() => {
    if (selectedCustomer) {
      localStorage.setItem('WM_SELECTED_CUSTOMER', selectedCustomer);
    } else {
      localStorage.removeItem('WM_SELECTED_CUSTOMER');
    }
  }, [selectedCustomer]);

  const [modalMode, setModalMode] = useState<SheetActionType | 'EDIT' | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  
  useEffect(() => {
    if (initialAction) {
       setModalMode(initialAction);
    }
  }, [initialAction]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [historySort, setHistorySort] = useState<'DATE_DESC' | 'ITEM_ASC'>('ITEM_ASC'); 
  const [range, setRange] = useState<DateRangeOption>('TODAY'); 
  const [start, setStart] = useState(new Date().toISOString().split('T')[0]);
  const [end, setEnd] = useState(new Date().toISOString().split('T')[0]);

  const [editingTransaction, setEditingTransaction] = useState<SheetTransaction | null>(null);

  // Derived Data
  const customerSummaries = useMemo(() => calculateCustomerSummaries(transactions), [transactions]);
  
  const currentCustomerStock = useMemo(() => {
    if (!selectedCustomer) return [];
    let items = getCustomerStock(transactions, selectedCustomer);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => i.code.toLowerCase().includes(q) || i.type.toLowerCase().includes(q));
    }
    return items;
  }, [transactions, selectedCustomer, searchQuery]);
  
  const currentCustomerHistoryWithBalance = useMemo(() => {
    if (!selectedCustomer) return [];
    
    // Chronological sort
    const chronological = transactions
      .filter(t => t.customerName === selectedCustomer)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id.localeCompare(b.id));

    let runningRaw = 0;
    let runningCut = 0;

    const withBalance = chronological.map(t => {
      if (t.action === 'RECEIVE') {
        runningRaw += t.quantity;
      } else if (t.action === 'PROCESS') {
        const source = t.sourceCategory || 'RAW';
        if (source === 'RAW') {
          runningRaw -= t.quantity;
          runningCut += t.quantity;
        }
      } else if (t.action === 'RETURN') {
        if (t.stockCategory === 'CUT') {
          runningCut -= t.quantity;
        } else {
          runningRaw -= t.quantity;
        }
      } else if (t.action === 'WASTAGE') {
          if (t.sourceCategory === 'CUT') {
              runningCut -= t.quantity;
          } else {
              runningRaw -= t.quantity;
          }
      }

      return {
        ...t,
        balanceAfter: runningRaw + runningCut
      };
    });

    const dateFiltered = filterDataByDate(withBalance, range, start, end);
    let filtered = dateFiltered;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.sheetCode.toLowerCase().includes(q) || 
        t.sheetType.toLowerCase().includes(q) ||
        t.details?.toLowerCase().includes(q)
      );
    }

    if (historySort === 'DATE_DESC') {
      return filtered.reverse();
    } else {
      return filtered.sort((a, b) => a.sheetCode.localeCompare(b.sheetCode) || a.sheetType.localeCompare(b.sheetType));
    }
  }, [transactions, selectedCustomer, historySort, searchQuery, range, start, end]);

  const exportData = useMemo(() => {
    return currentCustomerHistoryWithBalance.map(({ id, photoUrl, customerName, ...rest }) => ({
      Date: rest.date,
      Action: rest.action,
      Code: rest.sheetCode,
      Type: rest.sheetType,
      Quantity: rest.quantity,
      Source: rest.sourceCategory || '-',
      Target: rest.stockCategory || '-',
      Ref: rest.referredBy || '-',
      WastageStatus: rest.wastageStatus || '-',
      Details: rest.details || '',
      'Total Balance': rest.balanceAfter
    }));
  }, [currentCustomerHistoryWithBalance]);

  // --- FORM STATES ---
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [details, setDetails] = useState(''); 
  const [formCustomer, setFormCustomer] = useState(''); 
  const [referredBy, setReferredBy] = useState(''); // New State
  
  // Receive
  const [receiveCustomer, setReceiveCustomer] = useState('');
  const [receiveRows, setReceiveRows] = useState([{ code: '', type: '', qty: 0 }]);

  // Process
  const [processRows, setProcessRows] = useState<{
    stockKey: string;
    qty: number;
    status: ProcessingStatus;
    source: StockCategory;
  }[]>([{ stockKey: '', qty: 0, status: 'SIZES_CONFIRMED', source: 'RAW' }]);

  // Return/Gate Pass
  // Map Key: "stockKey-CATEGORY" (e.g. "A-100-Acrylic-RAW")
  const [returnMap, setReturnMap] = useState<Record<string, number>>({});
  
  const [driverName, setDriverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // If customer is selected in view, use it. Otherwise use the form input.
  const activeModalCustomer = selectedCustomer || formCustomer;
  
  const activeModalStock = useMemo(() => {
      if (!activeModalCustomer) return [];
      return getCustomerStock(transactions, activeModalCustomer);
  }, [transactions, activeModalCustomer]);

  // --- HANDLERS ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const openEdit = (t: SheetTransaction) => {
    setEditingTransaction(t);
    setModalMode('EDIT');
    setDate(t.date);
  };

  const handleEditChange = (field: keyof SheetTransaction, value: any) => {
    setEditingTransaction(prev => prev ? { ...prev, [field]: value } : null);
  };

  const resetForms = () => {
    setModalMode(null);
    setEditingTransaction(null);
    setDate(new Date().toISOString().split('T')[0]);
    setPhotoUrl('');
    setReceiveRows([{ code: '', type: '', qty: 0 }]);
    setReceiveCustomer('');
    setFormCustomer('');
    setReferredBy('');
    setProcessRows([{ stockKey: '', qty: 0, status: 'SIZES_CONFIRMED', source: 'RAW' }]);
    setReturnMap({});
    setDriverName('');
    setVehicleNumber('');
    setDetails('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (modalMode === 'EDIT' && editingTransaction && onUpdateTransaction) {
        onUpdateTransaction(editingTransaction.id, {
            date,
            quantity: Number(editingTransaction.quantity),
            details: editingTransaction.details,
            driverName: editingTransaction.driverName,
            vehicleNumber: editingTransaction.vehicleNumber
        });
        resetForms();
        return;
    }

    if (modalMode === 'RECEIVE') {
      const targetCustomer = selectedCustomer || receiveCustomer;
      receiveRows.forEach(row => {
        if (row.qty > 0 && row.code && row.type && targetCustomer) {
          onAddTransaction({
            date,
            customerName: targetCustomer,
            sheetCode: row.code,
            sheetType: row.type,
            quantity: row.qty,
            action: 'RECEIVE',
            stockCategory: 'RAW',
            referredBy, // Add ref
            photoUrl,
            details 
          });
        }
      });
    } 
    else if (modalMode === 'PROCESS' && activeModalCustomer) {
      processRows.forEach(row => {
        const stockItem = activeModalStock.find(s => s.key === row.stockKey);
        if (stockItem && row.qty > 0) {
          onAddTransaction({
            date,
            customerName: activeModalCustomer,
            sheetCode: stockItem.code,
            sheetType: stockItem.type,
            quantity: row.qty,
            action: 'PROCESS',
            sourceCategory: row.source,
            stockCategory: 'CUT', 
            processingStatus: row.status,
            details: row.source === 'RAW' 
              ? `Started Workflow: ${row.status.replace(/_/g, ' ')}` 
              : `Status Update: ${row.status.replace(/_/g, ' ')}`
          });
        }
      });
    } 
    else if (modalMode === 'RETURN' && activeModalCustomer) {
      Object.entries(returnMap).forEach(([compositeKey, qty]) => {
          // compositeKey is "stockKey|CATEGORY"
          const [stockKey, category] = compositeKey.split('|');
          
          if (!stockKey || !category || (qty as number) <= 0) return;
          
          const stockItem = activeModalStock.find(s => s.key === stockKey);
          
          if (stockItem) {
            onAddTransaction({
                date,
                customerName: activeModalCustomer,
                sheetCode: stockItem.code,
                sheetType: stockItem.type,
                quantity: qty,
                action: 'RETURN', // Always return, no wastage status
                sourceCategory: 'RAW', // Not strictly used for RETURN logic but good for record
                stockCategory: category as StockCategory, // 'RAW' or 'CUT'
                driverName,
                vehicleNumber,
                photoUrl,
                details 
            });
          }
      });
    }
    resetForms();
  };

  const handleReturnMapChange = (stockKey: string, category: 'RAW' | 'CUT', value: number) => {
      const compositeKey = `${stockKey}|${category}`;
      setReturnMap(prev => ({
          ...prev,
          [compositeKey]: value
      }));
  };

  // Row Management Handlers
  const handleAddRow = (type: 'RECEIVE' | 'PROCESS') => {
    if (type === 'RECEIVE') setReceiveRows([...receiveRows, { code: '', type: '', qty: 0 }]);
    if (type === 'PROCESS') setProcessRows([...processRows, { stockKey: '', qty: 0, status: 'SIZES_CONFIRMED', source: 'RAW' }]);
  };
  const handleRemoveRow = (type: 'RECEIVE' | 'PROCESS', index: number) => {
    if (type === 'RECEIVE') { const n = [...receiveRows]; n.splice(index, 1); setReceiveRows(n); }
    if (type === 'PROCESS') { const n = [...processRows]; n.splice(index, 1); setProcessRows(n); }
  };
  const handleRowChange = (type: 'RECEIVE' | 'PROCESS', index: number, field: string, value: any) => {
    if (type === 'RECEIVE') { const n = [...receiveRows]; (n[index] as any)[field] = value; setReceiveRows(n); }
    if (type === 'PROCESS') { const n = [...processRows]; (n[index] as any)[field] = value; setProcessRows(n); }
  };

  const openAction = (mode: SheetActionType) => {
    setModalMode(mode);
  };

  return (
    <div className="flex flex-col h-full space-y-6 p-6">
      
      {/* 1. CUSTOMER LIST VIEW (MAIN) */}
      {!selectedCustomer && (
        <>
          <div className="flex justify-between items-end">
             <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
               <Users className="w-6 h-6 text-indigo-600" /> Customer Sheets
             </h2>
             <button 
                onClick={() => { resetForms(); setModalMode('RECEIVE'); }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 shadow-md flex items-center gap-2"
              >
                <PackagePlus className="w-4 h-4" /> Receive Sheets
              </button>
          </div>
          
          <ExportToolbar data={customerSummaries} title="Customer Balances" dateRangeText={`${start} to ${end}`} />

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="p-4">Customer Name</th>
                  <th className="p-4 text-center">Total Received</th>
                  <th className="p-4 text-center">Total Cut</th>
                  <th className="p-4 text-center font-bold bg-slate-100">Raw Bal</th>
                  <th className="p-4 text-center">Total Return</th>
                  <th className="p-4 text-right">Current Balance</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerSummaries.map(c => (
                  <tr 
                    key={c.customerName} 
                    className="hover:bg-slate-50 group transition-colors"
                  >
                    <td 
                        className="p-4 font-bold text-slate-800 cursor-pointer" 
                        onClick={() => setSelectedCustomer(c.customerName)}
                    >
                        {c.customerName}
                    </td>
                    <td className="p-4 text-center text-blue-600 font-medium bg-blue-50/20">{c.totalReceived}</td>
                    <td className="p-4 text-center text-amber-600 font-medium bg-amber-50/20">{c.totalCut}</td>
                    <td className="p-4 text-center font-bold text-slate-800 bg-slate-100">{c.balanceRaw}</td>
                    <td className="p-4 text-center text-green-600">{c.totalReturned}</td>
                    <td className="p-4 text-right">
                       <span className={`px-3 py-1 rounded-full font-bold ${c.totalBalance > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                        {c.totalBalance}
                      </span>
                    </td>
                    <td className="p-4 text-right text-slate-400 flex justify-end gap-4 items-center">
                       <button 
                         onClick={() => onDeleteCustomer && onDeleteCustomer(c.customerName)}
                         className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                         title="Delete Customer & All Data"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                       <div onClick={() => setSelectedCustomer(c.customerName)} className="cursor-pointer hover:text-indigo-500">
                          <ChevronRight className="w-5 h-5" />
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 2. CUSTOMER DETAIL VIEW */}
      {selectedCustomer && (
        <div className="flex flex-col h-full space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4 border-b border-slate-200 pb-4">
             <div className="flex items-center gap-4">
                <button 
                    onClick={() => setSelectedCustomer(null)}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                >
                <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                <h2 className="text-xl font-bold text-slate-800">{selectedCustomer}</h2>
                <div className="text-sm text-slate-500">Inventory & History</div>
                </div>
             </div>
             
             {/* Search Bar */}
             <div className="flex-1 max-w-md mx-auto relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search sheets, codes, details..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
             </div>

             <div className="flex gap-2 shrink-0">
                <button 
                  onClick={() => openAction('RECEIVE')}
                  className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
                >
                  <PackagePlus className="w-4 h-4" /> Receive
                </button>
                <button 
                  onClick={() => openAction('PROCESS')}
                  className="bg-amber-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 flex items-center gap-2"
                >
                  <Scissors className="w-4 h-4" /> Workflow
                </button>
                <button 
                  onClick={() => openAction('RETURN')}
                  className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"
                >
                  <Truck className="w-4 h-4" /> Gate Pass
                </button>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden">
             
             {/* LEFT: CURRENT STOCK INVENTORY (Simplified Columns) */}
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100 font-semibold text-slate-700 flex justify-between items-center">
                   <span>Current Inventory Breakdown</span>
                   <span className="text-xs bg-white border px-2 py-1 rounded text-slate-500">
                     Total Site Bal: {currentCustomerStock.reduce((a,b) => a + b.totalOnSite, 0)}
                   </span>
                </div>
                <div className="overflow-auto flex-1">
                   <table className="w-full text-xs text-left">
                     <thead className="bg-slate-50 text-slate-500 uppercase sticky top-0">
                       <tr>
                         <th className="p-2">Item</th>
                         <th className="p-2 text-center text-blue-600 bg-blue-50/30">Received</th>
                         <th className="p-2 text-center text-amber-600 bg-amber-50/30">Cut</th>
                         <th className="p-2 text-center text-green-600 bg-green-50/30">Return</th>
                         <th className="p-2 text-center font-bold">Balance</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {currentCustomerStock.filter(s => s.totalOnSite > 0 || s.totalReceived > 0).map(s => (
                         <tr key={s.key} className="hover:bg-slate-50">
                           <td className="p-2">
                             <div className="font-mono text-slate-700 font-bold">{s.code}</div>
                             <div className="text-[10px] text-slate-400">{s.type}</div>
                           </td>
                           <td className="p-2 text-center bg-blue-50/30">{s.totalReceived}</td>
                           <td className="p-2 text-center bg-amber-50/30">{s.totalProcessed}</td>
                           <td className="p-2 text-center bg-green-50/30">{(s.returnedRaw + s.returnedCut)}</td>
                           <td className="p-2 text-center font-bold text-slate-800">{s.totalOnSite}</td>
                         </tr>
                       ))}
                        {currentCustomerStock.length === 0 && (
                          <tr><td colSpan={5} className="p-6 text-center text-slate-400 text-xs">No active stock matching filter.</td></tr>
                        )}
                     </tbody>
                   </table>
                </div>
             </div>

             {/* RIGHT: HISTORY */}
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                     <span className="font-semibold text-slate-700">Transaction History</span>
                     <button 
                       onClick={() => setHistorySort(prev => prev === 'DATE_DESC' ? 'ITEM_ASC' : 'DATE_DESC')}
                       className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-white border px-2 py-1 rounded hover:bg-slate-50"
                     >
                        <ArrowUpDown className="w-3 h-3" />
                        {historySort === 'DATE_DESC' ? 'Newest First' : 'A-Z (Item)'}
                     </button>
                  </div>
                  <DateFilterBar 
                     range={range} setRange={setRange} 
                     customStart={start} setCustomStart={setStart} 
                     customEnd={end} setCustomEnd={setEnd}
                  />
                </div>
                
                <div className="p-2 border-b border-slate-100 bg-white">
                  <ExportToolbar data={exportData} title={`${selectedCustomer}_History`} dateRangeText={`${start} to ${end}`} />
                </div>

                <div className="overflow-auto flex-1">
                   <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0">
                       <tr>
                         <th className="p-3">Date</th>
                         <th className="p-3">Action</th>
                         <th className="p-3">Item</th>
                         <th className="p-3 text-right">Qty</th>
                         <th className="p-3 text-center">Condition</th>
                         <th className="p-3 text-center">Actions</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {currentCustomerHistoryWithBalance.map(t => (
                          <tr key={t.id} className="hover:bg-slate-50 group">
                             <td className="p-3 text-slate-500 whitespace-nowrap text-xs">{t.date}</td>
                             <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  t.action === 'RECEIVE' ? 'bg-blue-100 text-blue-700' :
                                  t.action === 'PROCESS' ? 'bg-amber-100 text-amber-700' :
                                  t.action === 'WASTAGE' ? 'bg-red-100 text-red-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {t.action}
                                </span>
                             </td>
                             <td className="p-3">
                               <div className="font-medium text-slate-700 text-xs">{t.sheetCode}</div>
                               <div className="text-[10px] text-slate-400">
                                 {t.details} 
                                </div>
                             </td>
                             <td className="p-3 text-right font-mono text-sm">{t.quantity}</td>
                             <td className="p-3 text-center">
                                {t.wastageStatus && t.wastageStatus !== 'NO' ? (
                                   <span className="text-[10px] bg-red-50 text-red-600 px-1 py-0.5 rounded font-bold">{t.wastageStatus} WASTE</span>
                                ) : (
                                   <span className="text-[10px] text-slate-400">-</span>
                                )}
                             </td>
                             <td className="p-3 text-center flex items-center justify-center gap-2">
                                {t.photoUrl && (
                                   <button 
                                      onClick={(e) => { e.stopPropagation(); setViewingImage(t.photoUrl || null); }}
                                      className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-all"
                                      title="View Image"
                                   >
                                      <ImageIcon className="w-3.5 h-3.5" />
                                   </button>
                                )}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); openEdit(t); }}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                    title="Edit Transaction"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDeleteTransaction && onDeleteTransaction(t.id); }}
                                    className="p-1.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                    title="Delete Transaction"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                             </td>
                          </tr>
                        ))}
                     </tbody>
                   </table>
                </div>
             </div>

          </div>
        </div>
      )}

      {/* --- MODALS --- */}
      
      {/* IMAGE VIEWER MODAL */}
      {viewingImage && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
           <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center">
              <button 
                onClick={() => setViewingImage(null)}
                className="absolute -top-10 right-0 text-white hover:text-gray-300"
              >
                <X className="w-8 h-8" />
              </button>
              <img 
                src={viewingImage} 
                alt="Transaction Evidence" 
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl bg-white"
                onClick={(e) => e.stopPropagation()} 
              />
           </div>
        </div>
      )}
      
      {/* 4. EDIT TRANSACTION */}
      {modalMode === 'EDIT' && editingTransaction && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <h3 className="text-lg font-bold mb-4">Edit Transaction</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                        <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full border p-2 rounded" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantity</label>
                        <input 
                            type="number" 
                            required 
                            value={editingTransaction.quantity} 
                            onChange={e => handleEditChange('quantity', Number(e.target.value))} 
                            className="w-full border p-2 rounded" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Details</label>
                        <input 
                            type="text" 
                            value={editingTransaction.details || ''} 
                            onChange={e => handleEditChange('details', e.target.value)} 
                            className="w-full border p-2 rounded" 
                        />
                    </div>
                    {editingTransaction.action === 'RETURN' && (
                        <>
                           <input 
                                placeholder="Driver Name"
                                value={editingTransaction.driverName || ''} 
                                onChange={e => handleEditChange('driverName', e.target.value)} 
                                className="w-full border p-2 rounded" 
                            />
                            <input 
                                placeholder="Vehicle Number"
                                value={editingTransaction.vehicleNumber || ''} 
                                onChange={e => handleEditChange('vehicleNumber', e.target.value)} 
                                className="w-full border p-2 rounded" 
                            />
                        </>
                    )}
                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={resetForms} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Save Changes</button>
                    </div>
                </form>
             </div>
         </div>
      )}

      {/* 1. RECEIVE */}
      {modalMode === 'RECEIVE' && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b bg-blue-600 text-white flex justify-between items-center">
              <h2 className="font-bold flex items-center gap-2"><PackagePlus className="w-5 h-5" /> Receive Sheets</h2>
              <button onClick={resetForms} className="hover:bg-white/20 p-1 rounded-full">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                      <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full border p-2 rounded" />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Customer</label>
                       {selectedCustomer ? (
                          <input disabled value={selectedCustomer} className="w-full border p-2 rounded bg-slate-100" />
                       ) : (
                          <>
                           <input 
                              required 
                              list="cust-list" 
                              value={receiveCustomer} 
                              onChange={e => setReceiveCustomer(e.target.value)}
                              className="w-full border p-2 rounded"
                              placeholder="Select or Type..."
                           />
                           <datalist id="cust-list">
                             {customerSummaries.map(c => <option key={c.customerName} value={c.customerName} />)}
                           </datalist>
                          </>
                       )}
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Referred By</label>
                    <input 
                      value={referredBy}
                      onChange={e => setReferredBy(e.target.value)}
                      className="w-full border p-2 rounded"
                      placeholder="e.g. Sales Agent Name"
                    />
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Items</label>
                    {receiveRows.map((row, idx) => (
                      <div key={idx} className="flex flex-col md:flex-row gap-2 mb-4 md:mb-2 border-b md:border-none pb-4 md:pb-0 border-slate-100">
                        <input placeholder="Code" value={row.code} onChange={e => handleRowChange('RECEIVE', idx, 'code', e.target.value)} className="w-full md:flex-1 border p-2 rounded" required />
                        <input placeholder="Type" value={row.type} onChange={e => handleRowChange('RECEIVE', idx, 'type', e.target.value)} className="w-full md:flex-1 border p-2 rounded" required />
                        <div className="flex gap-2">
                           <input type="number" placeholder="Qty" value={row.qty || ''} onChange={e => handleRowChange('RECEIVE', idx, 'qty', Number(e.target.value))} className="w-full md:w-24 border p-2 rounded" required />
                           {receiveRows.length > 1 && <button type="button" onClick={() => handleRemoveRow('RECEIVE', idx)} className="p-2 text-red-400 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>}
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => handleAddRow('RECEIVE')} className="text-sm text-blue-600 flex items-center gap-1 mt-2"><Plus className="w-4 h-4"/> Add Row</button>
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Note / Details</label>
                    <textarea 
                        value={details} 
                        onChange={e => setDetails(e.target.value)} 
                        className="w-full border p-2 rounded h-20 resize-none" 
                        placeholder="Enter any necessary information..."
                    />
                 </div>

                 <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center cursor-pointer hover:bg-slate-50"
                 >
                    <span className="text-sm text-slate-500 flex items-center justify-center gap-2">
                      {photoUrl ? <span className="text-green-600 flex items-center gap-1"><ClipboardCheck className="w-4 h-4"/> Photo Added</span> : 'Upload Challan'}
                    </span>
                    <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                 </div>
              </div>
              <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
                <button type="button" onClick={resetForms} className="px-4 py-2 text-slate-600">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded shadow">Submit</button>
              </div>
            </form>
          </div>
         </div>
      )}

      {/* 2. PROCESS (BATCH CUTTING) */}
      {modalMode === 'PROCESS' && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[90vh] overflow-hidden">
               <div className="p-4 border-b bg-amber-500 text-white flex justify-between items-center">
                 <h2 className="font-bold flex items-center gap-2"><Scissors className="w-5 h-5"/> Batch Cutting Workflow</h2>
                 <button onClick={resetForms} className="hover:bg-white/20 p-1 rounded-full">✕</button>
               </div>
               
               <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                     
                     {/* Customer Selector if not already selected */}
                     {!selectedCustomer && (
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Customer</label>
                           <input 
                              required 
                              list="cust-list-process" 
                              value={formCustomer} 
                              onChange={e => setFormCustomer(e.target.value)}
                              className="w-full border p-2 rounded bg-slate-50 border-amber-200"
                              placeholder="Search Customer..."
                           />
                           <datalist id="cust-list-process">
                             {customerSummaries.map(c => <option key={c.customerName} value={c.customerName} />)}
                           </datalist>
                        </div>
                     )}

                     {activeModalCustomer ? (
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Sheets to Process ({activeModalCustomer})</label>
                           
                           <div className="space-y-3">
                             {processRows.map((row, idx) => {
                               const item = activeModalStock.find(s => s.key === row.stockKey);
                               return (
                                 <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                   <div className="flex flex-col md:flex-row gap-3 items-end">
                                     <div className="w-full md:flex-1">
                                       <label className="text-[10px] text-slate-400 uppercase mb-1 block">Sheet Selection</label>
                                       <select 
                                          required 
                                          value={row.stockKey} 
                                          onChange={e => handleRowChange('PROCESS', idx, 'stockKey', e.target.value)}
                                          className="w-full border p-2 rounded bg-white"
                                       >
                                         <option value="">-- Choose Sheet --</option>
                                         {activeModalStock.filter(s => s.totalOnSite > 0).map(s => (
                                           <option key={s.key} value={s.key}>
                                             {s.code} ({s.type})
                                           </option>
                                         ))}
                                       </select>
                                     </div>
                                     
                                     {/* Context Info */}
                                     {item && (
                                       <div className="px-3 py-1 bg-white border rounded text-xs text-slate-500 flex flex-col h-[42px] justify-center min-w-[100px]">
                                          <div className="flex justify-between"><span>Raw:</span> <span className="font-bold text-slate-800">{item.balanceRaw}</span></div>
                                          <div className="flex justify-between"><span>Cut:</span> <span className="font-bold text-amber-600">{item.balanceCut}</span></div>
                                       </div>
                                     )}

                                     <div className="w-full md:w-32">
                                        <label className="text-[10px] text-slate-400 uppercase mb-1 block">Source</label>
                                        <select 
                                          value={row.source}
                                          onChange={e => handleRowChange('PROCESS', idx, 'source', e.target.value)}
                                          className="w-full border p-2 rounded bg-white"
                                        >
                                           <option value="RAW">From Raw (Move)</option>
                                           <option value="CUT">From Cut (Update)</option>
                                        </select>
                                     </div>

                                     <div className="w-full md:w-24">
                                       <label className="text-[10px] text-slate-400 uppercase mb-1 block">
                                          Qty (Max: {item ? (row.source === 'RAW' ? item.balanceRaw : item.balanceCut) : '-'})
                                       </label>
                                       <input 
                                          type="number" 
                                          min="1" 
                                          max={item ? (row.source === 'RAW' ? item.balanceRaw : item.balanceCut) : undefined}
                                          value={row.qty || ''} 
                                          onChange={e => handleRowChange('PROCESS', idx, 'qty', Number(e.target.value))} 
                                          className="w-full border p-2 rounded bg-white font-mono"
                                          placeholder="0"
                                          required
                                       />
                                     </div>
                                     
                                     <div className="w-full md:w-48">
                                        <label className="text-[10px] text-slate-400 uppercase mb-1 block">New Status</label>
                                        <select 
                                          value={row.status} 
                                          onChange={e => handleRowChange('PROCESS', idx, 'status', e.target.value as any)} 
                                          className="w-full border p-2 rounded bg-white text-sm"
                                        >
                                          <option value="SIZES_CONFIRMED">Sizes Confirmed</option>
                                          <option value="PRINTED_FOR_CUTTING">Printed for Cutting</option>
                                          <option value="CUTTING_COMPLETED">Cutting Completed</option>
                                       </select>
                                     </div>

                                     {processRows.length > 1 && (
                                       <button type="button" onClick={() => handleRemoveRow('PROCESS', idx)} className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                                         <Trash2 className="w-5 h-5" />
                                       </button>
                                     )}
                                   </div>
                                 </div>
                               );
                             })}
                           </div>
                           
                           <button type="button" onClick={() => handleAddRow('PROCESS')} className="mt-3 text-sm text-amber-600 flex items-center gap-1 font-medium hover:text-amber-700">
                             <Plus className="w-4 h-4"/> Add Another Sheet
                           </button>
                        </div>
                     ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-slate-400 bg-slate-50 rounded-lg border-2 border-dashed">
                           <Users className="w-8 h-8 mb-2 opacity-50" />
                           <p>Please select a customer to start workflow.</p>
                        </div>
                     )}
                  </div>
                  
                  <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
                     <button type="button" onClick={resetForms} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                     <button type="submit" disabled={!activeModalCustomer} className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded shadow font-bold disabled:opacity-50">Update Workflow</button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* 3. RETURN (BATCH GATE PASS - REVISED LIST VIEW) */}
      {modalMode === 'RETURN' && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[90vh] overflow-hidden">
              <div className="p-4 border-b bg-green-600 text-white flex justify-between items-center">
                 <h2 className="font-bold flex items-center gap-2"><Truck className="w-5 h-5"/> Batch Gate Pass</h2>
                 <button onClick={resetForms} className="hover:bg-white/20 p-1 rounded-full">✕</button>
              </div>
              
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                 <div className="flex-1 overflow-y-auto">
                    
                    {!selectedCustomer && (
                        <div className="p-4 bg-slate-50 border-b border-slate-100">
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Customer</label>
                           <input 
                              required 
                              list="cust-list-return" 
                              value={formCustomer} 
                              onChange={e => setFormCustomer(e.target.value)}
                              className="w-full border p-2 rounded bg-white border-green-200"
                              placeholder="Search Customer..."
                           />
                           <datalist id="cust-list-return">
                             {customerSummaries.map(c => <option key={c.customerName} value={c.customerName} />)}
                           </datalist>
                        </div>
                     )}

                    {/* Items List */}
                    {activeModalCustomer ? (
                       <div className="p-0">
                          <table className="w-full text-sm text-left">
                             <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0 z-10">
                                <tr>
                                   <th className="p-3">Item</th>
                                   <th className="p-3">Source Type</th>
                                   <th className="p-3 text-center bg-blue-50">Available</th>
                                   <th className="p-3 text-center w-24">Return Qty</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                                {activeModalStock.flatMap(s => {
                                   const rows = [];
                                   // Render Raw Row
                                   if (s.balanceRaw > 0) {
                                       rows.push({ ...s, displayType: 'RAW', avail: s.balanceRaw });
                                   }
                                   // Render Cut Row
                                   if (s.balanceCut > 0) {
                                       rows.push({ ...s, displayType: 'CUT', avail: s.balanceCut });
                                   }
                                   return rows;
                                }).map((row, idx) => {
                                   const key = `${row.key}|${row.displayType}`;
                                   const currentQty = returnMap[key] || 0;
                                   
                                   return (
                                      <tr key={idx} className="hover:bg-slate-50">
                                         <td className="p-3">
                                            <div className="font-bold text-slate-700">{row.code}</div>
                                            <div className="text-xs text-slate-400">{row.type}</div>
                                         </td>
                                         <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                row.displayType === 'RAW' ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-800'
                                            }`}>
                                                {row.displayType === 'RAW' ? 'Raw Sheet' : 'Cut Piece'}
                                            </span>
                                         </td>
                                         <td className="p-3 text-center font-mono bg-blue-50/20 text-slate-500 font-bold">{row.avail}</td>
                                         <td className="p-2">
                                            <input 
                                               type="number"
                                               min="0"
                                               max={row.avail}
                                               value={currentQty || ''}
                                               onChange={e => handleReturnMapChange(row.key, row.displayType as any, Number(e.target.value))}
                                               placeholder="0"
                                               className="w-full border p-1.5 rounded text-center focus:ring-2 focus:ring-green-500 outline-none font-bold"
                                            />
                                         </td>
                                      </tr>
                                   );
                                })}
                                {activeModalStock.every(s => s.balanceRaw <= 0 && s.balanceCut <= 0) && (
                                   <tr><td colSpan={4} className="p-8 text-center text-slate-400">No active stock available for gate pass.</td></tr>
                                )}
                             </tbody>
                          </table>
                       </div>
                    ) : (
                       <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                          <Users className="w-12 h-12 mb-4 opacity-20" />
                          <p>Select a customer to view available items.</p>
                       </div>
                    )}

                    <div className="p-6 space-y-4 bg-slate-50/50 border-t border-slate-100 mt-4">
                       <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Note / Details</label>
                          <textarea 
                              value={details} 
                              onChange={e => setDetails(e.target.value)} 
                              className="w-full border p-2 rounded h-20 resize-none bg-white" 
                              placeholder="Enter reason, condition details, or other notes..."
                          />
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Driver Name</label>
                              <input required value={driverName} onChange={e => setDriverName(e.target.value)} className="w-full border p-2 rounded bg-white" placeholder="Name" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vehicle No.</label>
                              <input required value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} className="w-full border p-2 rounded bg-white" placeholder="Number" />
                          </div>
                       </div>

                       <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="border border-dashed p-4 rounded-lg text-center cursor-pointer text-sm text-slate-500 hover:bg-white bg-white transition-colors"
                       >
                          {photoUrl ? <span className="text-green-600 font-bold">✓ Departure Photo Attached</span> : 'Click to Upload Departure Photo'}
                          <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                       </div>
                    </div>
                 </div>

                 <div className="p-4 border-t bg-white flex justify-end gap-2 shadow-inner z-20">
                    <button type="button" onClick={resetForms} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                    <button type="submit" disabled={!activeModalCustomer} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow font-bold disabled:opacity-50">Generate Pass</button>
                 </div>
              </form>
            </div>
         </div>
      )}

    </div>
  );
};

export default CustomerSheetsManager;
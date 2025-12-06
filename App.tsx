import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Scissors, 
  Users,
  LogOut,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  AlertCircle,
  PackagePlus,
  Truck,
  PlusCircle,
  CreditCard
} from 'lucide-react';
import { Role, TableName, DateRangeOption, SheetActionType } from './types';
import { db } from './services/db';
import { ViewContainer } from './components/TableViews';
import CustomerSheetsManager from './components/CustomerSheetsManager';
import DateFilterBar, { filterDataByDate } from './components/DateFilterBar';

// Top Navigation Item Component
const NavItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
      active 
        ? 'bg-indigo-600 text-white' 
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

const App: React.FC = () => {
  const [role, setRole] = useState<Role>('admin');
  const [activeTab, setActiveTab] = useState<TableName | 'Dashboard' | 'CustomerSheets'>('Dashboard');
  
  // Dashboard Action State
  const [pendingSheetAction, setPendingSheetAction] = useState<SheetActionType | null>(null);
  const [pendingAddAction, setPendingAddAction] = useState<boolean>(false);

  // Data State
  const [cashFlow, setCashFlow] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [sheetTransactions, setSheetTransactions] = useState<any[]>([]);

  // Dashboard Filter State
  const [dashRange, setDashRange] = useState<DateRangeOption>('TODAY');
  const [dashStart, setDashStart] = useState(new Date().toISOString().split('T')[0]);
  const [dashEnd, setDashEnd] = useState(new Date().toISOString().split('T')[0]);

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      setCashFlow(await db.getCashFlow());
      setInvoices(await db.getInvoices());
      setSheetTransactions(await db.getSheetTransactions());
    };
    loadData();
  }, []);

  // Generic Add Handler
  const handleAdd = async (table: TableName, data: any) => {
    const newItem = await db.addEntry(table, data);
    if (table === 'CashFlow') setCashFlow(prev => [newItem, ...prev]);
    if (table === 'Invoices') setInvoices(prev => [newItem, ...prev]);
    if (table === 'SheetTransactions') setSheetTransactions(prev => [newItem, ...prev]);
  };

  const handleUpdate = async (table: TableName, id: string, data: any) => {
    await db.updateEntry(table, id, data);
    // Refresh local state
    if (table === 'SheetTransactions') {
       setSheetTransactions(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
    }
  };

  // Quick Action Handlers
  const triggerSheetAction = (action: SheetActionType) => {
    setActiveTab('CustomerSheets');
    setPendingSheetAction(action);
    setPendingAddAction(false);
  };

  const triggerAddAction = (tab: TableName) => {
    setActiveTab(tab);
    setPendingAddAction(true);
    setPendingSheetAction(null);
  };

  // Reset triggers when leaving a tab
  useEffect(() => {
    if (activeTab === 'Dashboard') {
        setPendingSheetAction(null);
        setPendingAddAction(false);
    }
  }, [activeTab]);

  // Calculate Dashboard Stats
  const dashboardStats = React.useMemo(() => {
    const filteredCash = filterDataByDate(cashFlow, dashRange, dashStart, dashEnd);
    const filteredSheets = filterDataByDate(sheetTransactions, dashRange, dashStart, dashEnd);
    const filteredInvoices = filterDataByDate(invoices, dashRange, dashStart, dashEnd);

    // Cash
    let cashIn = 0;
    let cashOut = 0;
    filteredCash.forEach(c => {
      if (c.type === 'INCOME') cashIn += c.amount;
      else cashOut += c.amount;
    });

    // Sheets
    let sheetsIn = 0;
    let sheetsOut = 0; // Returns + Wastage
    filteredSheets.forEach(t => {
      if (t.action === 'RECEIVE') sheetsIn += t.quantity;
      if (t.action === 'RETURN' || t.action === 'WASTAGE') sheetsOut += t.quantity;
    });

    // Invoices
    const createdInPeriod = filteredInvoices;
    const pendingInPeriod = createdInPeriod.filter(i => i.status === 'PENDING' || i.status === 'OVERDUE');
    const pendingAmount = pendingInPeriod.reduce((acc, i) => acc + i.amount, 0);

    return {
      cash: { in: cashIn, out: cashOut, bal: cashIn - cashOut },
      sheets: { in: sheetsIn, out: sheetsOut, bal: sheetsIn - sheetsOut },
      invoices: { count: pendingInPeriod.length, amount: pendingAmount }
    };
  }, [cashFlow, sheetTransactions, invoices, dashRange, dashStart, dashEnd]);

  const navItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
    { id: 'CustomerSheets', label: 'Customer Sheets', icon: Layers, roles: ['admin', 'staff'] },
    { id: 'CashFlow', label: 'Cash Flow', icon: FileText, roles: ['admin'] },
    { id: 'Invoices', label: 'Invoices', icon: FileText, roles: ['admin'] },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      
      {/* Top Header / Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
         <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Scissors className="text-white w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-slate-800 tracking-tight hidden md:block">Workshop<span className="text-indigo-600">Mgr</span></span>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar mx-4">
               {navItems.filter(item => item.roles.includes(role)).map(item => (
                  <NavItem 
                    key={item.id}
                    icon={item.icon} 
                    label={item.label} 
                    active={activeTab === item.id}
                    onClick={() => setActiveTab(item.id as any)}
                  />
               ))}
            </nav>

            {/* User Controls */}
            <div className="flex items-center gap-4">
               <button 
                  onClick={() => {
                    setRole(prev => prev === 'admin' ? 'staff' : 'admin');
                    setActiveTab(role === 'admin' ? 'CustomerSheets' : 'Dashboard'); 
                  }}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
               >
                 <Users className="w-3 h-3" />
                 {role === 'admin' ? 'Admin' : 'Staff'}
               </button>
               <div className="h-6 w-[1px] bg-slate-300 hidden md:block"></div>
               <button className="text-slate-500 hover:text-red-600 transition-colors">
                  <LogOut className="w-5 h-5" />
               </button>
            </div>
         </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-50/50">
        <div className="max-w-7xl mx-auto h-full">
          {activeTab === 'Dashboard' && role === 'admin' && (
            <div className="p-4 md:p-8 space-y-8">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <h1 className="text-2xl font-bold text-slate-800">Executive Dashboard</h1>
                 <DateFilterBar 
                   range={dashRange} setRange={setDashRange}
                   customStart={dashStart} setCustomStart={setDashStart}
                   customEnd={dashEnd} setCustomEnd={setDashEnd}
                   hideAllOption={true}
                 />
              </div>

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <button onClick={() => triggerSheetAction('RECEIVE')} className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col items-center gap-2 text-center group">
                      <div className="p-2 bg-white/20 rounded-full group-hover:scale-110 transition-transform"><PackagePlus className="w-6 h-6" /></div>
                      <span className="text-sm font-bold">Receive Sheet</span>
                  </button>
                  <button onClick={() => triggerSheetAction('PROCESS')} className="bg-amber-500 hover:bg-amber-600 text-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col items-center gap-2 text-center group">
                      <div className="p-2 bg-white/20 rounded-full group-hover:scale-110 transition-transform"><Scissors className="w-6 h-6" /></div>
                      <span className="text-sm font-bold">Work Flow</span>
                  </button>
                  <button onClick={() => triggerSheetAction('RETURN')} className="bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col items-center gap-2 text-center group">
                      <div className="p-2 bg-white/20 rounded-full group-hover:scale-110 transition-transform"><Truck className="w-6 h-6" /></div>
                      <span className="text-sm font-bold">Gate Pass</span>
                  </button>
                  <button onClick={() => triggerAddAction('CashFlow')} className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col items-center gap-2 text-center group">
                      <div className="p-2 bg-white/20 rounded-full group-hover:scale-110 transition-transform"><PlusCircle className="w-6 h-6" /></div>
                      <span className="text-sm font-bold">Add Inc/Exp</span>
                  </button>
                  <button onClick={() => triggerAddAction('Invoices')} className="bg-slate-700 hover:bg-slate-800 text-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col items-center gap-2 text-center group">
                      <div className="p-2 bg-white/20 rounded-full group-hover:scale-110 transition-transform"><CreditCard className="w-6 h-6" /></div>
                      <span className="text-sm font-bold">Add Invoice</span>
                  </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Cash Section */}
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                       <Wallet className="w-5 h-5 text-indigo-600" />
                       <h2 className="font-semibold text-slate-700">Cash Flow</h2>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-4">
                       <div>
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Income</div>
                          <div className="text-xl font-bold text-green-600">+{dashboardStats.cash.in.toLocaleString()}</div>
                       </div>
                       <div>
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Expense</div>
                          <div className="text-xl font-bold text-red-600">-{dashboardStats.cash.out.toLocaleString()}</div>
                       </div>
                       <div className="col-span-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-500">Net Balance</span>
                          <span className="text-2xl font-bold text-indigo-900">${dashboardStats.cash.bal.toLocaleString()}</span>
                       </div>
                    </div>
                 </div>

                 {/* Sheets Section */}
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                       <Layers className="w-5 h-5 text-indigo-600" />
                       <h2 className="font-semibold text-slate-700">Sheet Inventory</h2>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-4">
                       <div>
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">In</div>
                          <div className="text-xl font-bold text-slate-800">{dashboardStats.sheets.in}</div>
                       </div>
                       <div>
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Out/Waste</div>
                          <div className="text-xl font-bold text-slate-800">{dashboardStats.sheets.out}</div>
                       </div>
                       <div className="col-span-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-500">Net Movement</span>
                          <span className="text-2xl font-bold text-amber-600">{dashboardStats.sheets.bal}</span>
                       </div>
                    </div>
                 </div>

                 {/* Invoices Section */}
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                       <AlertCircle className="w-5 h-5 text-indigo-600" />
                       <h2 className="font-semibold text-slate-700">Invoices</h2>
                    </div>
                    <div className="p-6 flex flex-col justify-center h-full">
                        <div className="flex justify-between items-end mb-2">
                           <div>
                              <div className="text-4xl font-black text-slate-800">{dashboardStats.invoices.count}</div>
                              <div className="text-xs text-slate-500 font-medium">Pending Invoices</div>
                           </div>
                           <div className="text-right">
                              <div className="text-xl font-bold text-orange-600">${dashboardStats.invoices.amount.toLocaleString()}</div>
                              <div className="text-xs text-slate-400 uppercase font-bold">Outstanding</div>
                           </div>
                        </div>
                        <button 
                          onClick={() => setActiveTab('Invoices')} 
                          className="w-full mt-2 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                        >
                          View & Pay Invoices
                        </button>
                    </div>
                 </div>
              </div>

            </div>
          )}

          {activeTab === 'CustomerSheets' && (
            <CustomerSheetsManager 
              transactions={sheetTransactions} 
              onAddTransaction={(d) => handleAdd('SheetTransactions', d)}
              onUpdateTransaction={(id, d) => handleUpdate('SheetTransactions', id, d)}
              initialAction={pendingSheetAction}
            />
          )}

          {activeTab === 'CashFlow' && (
            <ViewContainer 
              title="Cash Flow Management" 
              tableName="CashFlow" 
              data={cashFlow} 
              onAdd={(d) => handleAdd('CashFlow', d)} 
              canAdd={role === 'admin'} 
              initialOpenAdd={pendingAddAction}
            />
          )}
          
          {activeTab === 'Invoices' && (
             <ViewContainer 
               title="Customer Invoices" 
               tableName="Invoices" 
               data={invoices} 
               onAdd={(d) => handleAdd('Invoices', d)} 
               canAdd={role === 'admin'} 
               initialOpenAdd={pendingAddAction}
             />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;

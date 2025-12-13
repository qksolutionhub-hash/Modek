import { 
  CashFlowEntry, 
  InvoiceEntry, 
  SheetTransaction,
  TableName 
} from '../types';
import { 
  MOCK_CASH_FLOW, 
  MOCK_INVOICES, 
  MOCK_SHEET_TRANSACTIONS
} from '../constants';

const STORAGE_KEY = 'FIRM_MGMT_DATA_V1';

// Helper to parse standard CSV lines allowing for quoted strings containing commas
const parseCSVLine = (text: string) => {
    if (!text) return [];
    const result = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') { inQuote = !inQuote; }
        else if (char === ',' && !inQuote) { result.push(cur); cur = ''; }
        else { cur += char; }
    }
    result.push(cur);
    return result.map(s => s.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
};

class MockGoogleSheetsDB {
  private cashFlow: CashFlowEntry[] = [];
  private invoices: InvoiceEntry[] = [];
  private sheetTransactions: SheetTransaction[] = [];

  constructor() {
    this.loadAllData();
    
    // Listen for storage events to update data across tabs
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith(STORAGE_KEY)) {
           console.log('Syncing data from another tab...');
           this.loadAllData();
           // Force a reload to reflect changes in the UI since this is a simple app
           window.location.reload();
        }
      });
    }
  }

  private loadAllData() {
    try {
      // Try to load individual tables
      this.cashFlow = this.loadTable('CashFlow', MOCK_CASH_FLOW);
      this.invoices = this.loadTable('Invoices', MOCK_INVOICES);
      this.sheetTransactions = this.loadTable('SheetTransactions', MOCK_SHEET_TRANSACTIONS);
    } catch (e) {
      console.error('Failed to load data from storage', e);
      // Fallback
      this.cashFlow = [...MOCK_CASH_FLOW];
      this.invoices = [...MOCK_INVOICES];
      this.sheetTransactions = [...MOCK_SHEET_TRANSACTIONS];
    }
  }

  private loadTable<T>(tableName: string, defaultData: T[]): T[] {
    const key = `${STORAGE_KEY}_${tableName}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return [...defaultData];
      }
    }
    return [...defaultData];
  }

  private saveTable(tableName: string, data: any[]) {
    try {
      const key = `${STORAGE_KEY}_${tableName}`;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save data', e);
    }
  }

  // --- PUBLIC API ---

  getCashFlow = () => Promise.resolve([...this.cashFlow]);
  getInvoices = () => Promise.resolve([...this.invoices]);
  getSheetTransactions = () => Promise.resolve([...this.sheetTransactions]);

  addEntry = (table: TableName, entry: any) => {
    const newEntry = { ...entry, id: Math.random().toString(36).substr(2, 9) };
    switch (table) {
      case 'CashFlow':
        this.cashFlow = [newEntry, ...this.cashFlow];
        this.saveTable('CashFlow', this.cashFlow);
        break;
      case 'Invoices':
        this.invoices = [newEntry, ...this.invoices];
        this.saveTable('Invoices', this.invoices);
        break;
      case 'SheetTransactions':
        this.sheetTransactions = [newEntry, ...this.sheetTransactions];
        this.saveTable('SheetTransactions', this.sheetTransactions);
        break;
    }
    return Promise.resolve(newEntry);
  };

  updateEntry = (table: TableName, id: string, updates: any) => {
    switch (table) {
      case 'SheetTransactions':
        this.sheetTransactions = this.sheetTransactions.map(t => 
          t.id === id ? { ...t, ...updates } : t
        );
        this.saveTable('SheetTransactions', this.sheetTransactions);
        return Promise.resolve(this.sheetTransactions.find(t => t.id === id));
      case 'Invoices':
          this.invoices = this.invoices.map(t => 
            t.id === id ? { ...t, ...updates } : t
          );
          this.saveTable('Invoices', this.invoices);
          return Promise.resolve(this.invoices.find(t => t.id === id));
      default:
        return Promise.resolve(null);
    }
  };

  deleteEntry = (table: TableName, id: string) => {
    switch (table) {
      case 'CashFlow':
        this.cashFlow = this.cashFlow.filter(item => item.id !== id);
        this.saveTable('CashFlow', this.cashFlow);
        break;
      case 'Invoices':
        this.invoices = this.invoices.filter(item => item.id !== id);
        this.saveTable('Invoices', this.invoices);
        break;
      case 'SheetTransactions':
        this.sheetTransactions = this.sheetTransactions.filter(item => item.id !== id);
        this.saveTable('SheetTransactions', this.sheetTransactions);
        break;
    }
    return Promise.resolve(true);
  };

  deleteCustomer = (customerName: string) => {
    // Delete all transactions related to this customer
    this.sheetTransactions = this.sheetTransactions.filter(t => t.customerName !== customerName);
    this.saveTable('SheetTransactions', this.sheetTransactions);
    return Promise.resolve(true);
  };

  // --- IMPORT CSV FEATURE ---
  importCSV = async (table: TableName, csvText: string) => {
    if (!csvText) return 0;
    
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    
    // Strategy: Look for a line containing known keys
    let headerLineIdx = -1;
    const knownKeys = {
       'CashFlow': ['DATE', 'DESCRIPTION', 'AMOUNT'],
       'Invoices': ['INVOICE', 'CUSTOMER', 'AMOUNT'],
       'SheetTransactions': ['DATE', 'ACTION', 'CODE']
    };
    
    // Safety check for table name validity
    if (!knownKeys[table]) {
        throw new Error("Invalid table type for import");
    }
    
    for(let i=0; i<Math.min(15, lines.length); i++) {
        const lineUpper = lines[i].toUpperCase();
        if (knownKeys[table].some(k => lineUpper.includes(k))) {
            headerLineIdx = i;
            break;
        }
    }

    if (headerLineIdx === -1) throw new Error("Could not find valid header row in CSV");

    const headers = parseCSVLine(lines[headerLineIdx]).map(h => h.toLowerCase());
    
    const newEntries: any[] = [];

    for(let i = headerLineIdx + 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        
        if (!values || values.length < headers.length) continue;

        const entry: any = { id: Math.random().toString(36).substr(2, 9) };
        
        headers.forEach((h, idx) => {
            let val = values[idx] || '';
            // Map common CSV headers back to internal keys
            if (h.includes('invoice')) h = 'id';
            if (h === 'total amount') h = 'amount';
            if (h === 'customer') h = 'customername';
            
            // Try to match key
            if (h === 'date') entry.date = val;
            if (h.includes('amount') || h === 'income' || h === 'expense') {
                 // Remove currency symbols and commas before parsing
                 const cleanVal = val.replace(/[^0-9.-]+/g, "");
                 if (cleanVal && !isNaN(parseFloat(cleanVal))) entry.amount = parseFloat(cleanVal);
            }
            if (h === 'description' || h === 'details') entry.description = val;
            if (h === 'customername') entry.customerName = val;
            if (h === 'action') entry.action = val;
            if (h === 'code') entry.sheetCode = val;
            if (h === 'type') entry.sheetType = val;
            
            // Allow loose matching for other fields
            Object.keys(entry).forEach(k => {
               if (k.toLowerCase() === h) entry[k] = val; 
            });
        });
        
        // Post-processing for CashFlow specifically
        if (table === 'CashFlow') {
             const incIdx = headers.indexOf('income');
             const expIdx = headers.indexOf('expense');
             const catIdx = headers.indexOf('category');
             const subIdx = headers.indexOf('subcategory');
             const descIdx = headers.indexOf('description');
             const dateIdx = headers.indexOf('date');

             if (dateIdx > -1) entry.date = values[dateIdx];
             if (descIdx > -1) entry.description = values[descIdx];
             if (catIdx > -1) entry.category = values[catIdx];
             if (subIdx > -1) entry.subCategory = values[subIdx];

             let inc = 0, exp = 0;
             if (incIdx > -1 && values[incIdx]) inc = parseFloat(values[incIdx].replace(/[^0-9.-]+/g,""));
             if (expIdx > -1 && values[expIdx]) exp = parseFloat(values[expIdx].replace(/[^0-9.-]+/g,""));
             
             if (inc > 0) { entry.type = 'INCOME'; entry.amount = inc; }
             else if (exp > 0) { entry.type = 'EXPENSE'; entry.amount = exp; }
             else { entry.type = 'INCOME'; entry.amount = 0; } // Default if neither
        }

        // Only add if it looks valid
        if (entry.date) newEntries.push(entry);
    }

    // Replace Table
    if (newEntries.length > 0) {
        if (table === 'CashFlow') { this.cashFlow = newEntries; this.saveTable('CashFlow', this.cashFlow); }
        if (table === 'Invoices') { this.invoices = newEntries; this.saveTable('Invoices', this.invoices); }
        if (table === 'SheetTransactions') { this.sheetTransactions = newEntries; this.saveTable('SheetTransactions', this.sheetTransactions); }
    }
    
    return newEntries.length;
  };
}

export const db = new MockGoogleSheetsDB();
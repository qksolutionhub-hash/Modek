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

class MockGoogleSheetsDB {
  private cashFlow: CashFlowEntry[] = [...MOCK_CASH_FLOW];
  private invoices: InvoiceEntry[] = [...MOCK_INVOICES];
  private sheetTransactions: SheetTransaction[] = [...MOCK_SHEET_TRANSACTIONS];

  getCashFlow = () => Promise.resolve([...this.cashFlow]);
  getInvoices = () => Promise.resolve([...this.invoices]);
  
  // Sheet Management
  getSheetTransactions = () => Promise.resolve([...this.sheetTransactions]);

  addEntry = (table: TableName, entry: any) => {
    const newEntry = { ...entry, id: Math.random().toString(36).substr(2, 9) };
    switch (table) {
      case 'CashFlow':
        this.cashFlow = [newEntry, ...this.cashFlow];
        break;
      case 'Invoices':
        this.invoices = [newEntry, ...this.invoices];
        break;
      case 'SheetTransactions':
        this.sheetTransactions = [newEntry, ...this.sheetTransactions];
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
        return Promise.resolve(this.sheetTransactions.find(t => t.id === id));
      case 'Invoices':
          this.invoices = this.invoices.map(t => 
            t.id === id ? { ...t, ...updates } : t
          );
          return Promise.resolve(this.invoices.find(t => t.id === id));
      default:
        return Promise.resolve(null);
    }
  };
}

export const db = new MockGoogleSheetsDB();

export type Role = 'admin' | 'staff';

export interface CashFlowEntry {
  id: string;
  date: string;
  description: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
}

export interface InvoiceEntry {
  id: string;
  date: string;
  customerName: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
}

export type SheetActionType = 'RECEIVE' | 'PROCESS' | 'RETURN' | 'WASTAGE';
export type ProcessingStatus = 'SIZES_CONFIRMED' | 'PRINTED_FOR_CUTTING' | 'CUTTING_COMPLETED' | 'NONE';
export type StockCategory = 'RAW' | 'CUT' | 'WASTAGE';

export interface SheetTransaction {
  id: string;
  date: string;
  customerName: string;
  sheetCode: string; // e.g., "A-100"
  sheetType: string; // e.g., "Acrylic 5mm"
  action: SheetActionType;
  quantity: number;
  
  // New Fields
  unit?: 'SHEET' | 'PCS';
  wastageStatus?: 'NO' | 'YES' | 'PARTIAL';

  // For tracking movement
  sourceCategory?: StockCategory; // Where it came from (e.g. RAW)
  stockCategory: StockCategory;   // Where it ends up (e.g. CUT)
  
  // For PROCESS action
  processingStatus?: ProcessingStatus;
  
  // For RECEIVE/RETURN
  photoUrl?: string; // Base64
  
  // For RETURN (Gate Pass)
  driverName?: string;
  vehicleNumber?: string;
  
  details?: string;
}

export type TableName = 'CashFlow' | 'Invoices' | 'SheetTransactions';

export type DateRangeOption = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'ALL' | 'CUSTOM';

import { CashFlowEntry, InvoiceEntry, SheetTransaction } from './types';

export const MOCK_CASH_FLOW: CashFlowEntry[] = [
  { id: '1', date: '2023-10-01', description: 'Initial Capital', type: 'INCOME', amount: 50000 },
  { id: '2', date: '2023-10-05', description: 'Rent Payment', type: 'EXPENSE', amount: 2000 },
  { id: '3', date: '2023-10-10', description: 'Material Purchase (Consumables)', type: 'EXPENSE', amount: 500 },
  { id: '4', date: '2023-10-15', description: 'Client Payment - ABC Corp', type: 'INCOME', amount: 8500 },
];

export const MOCK_INVOICES: InvoiceEntry[] = [
  { id: 'INV-001', date: '2023-10-15', customerName: 'ABC Corp', amount: 8500, status: 'PAID' },
  { id: 'INV-002', date: '2023-10-28', customerName: 'XYZ Ltd', amount: 12000, status: 'PENDING' },
];

export const MOCK_SHEET_TRANSACTIONS: SheetTransaction[] = [
  { 
    id: 'TRX-001', 
    date: '2023-10-10', 
    customerName: 'ABC Corp', 
    sheetCode: 'S-10mm', 
    sheetType: 'Steel 10mm', 
    action: 'RECEIVE', 
    stockCategory: 'RAW',
    quantity: 100, 
    details: 'Initial Batch' 
  },
  { 
    id: 'TRX-002', 
    date: '2023-10-12', 
    customerName: 'ABC Corp', 
    sheetCode: 'S-10mm', 
    sheetType: 'Steel 10mm', 
    action: 'PROCESS', 
    stockCategory: 'CUT', // Moving to Cut
    quantity: 20, 
    processingStatus: 'SIZES_CONFIRMED', 
    details: 'Batch 1 Prep' 
  },
  { 
    id: 'TRX-003', 
    date: '2023-10-14', 
    customerName: 'XYZ Ltd', 
    sheetCode: 'A-5mm', 
    sheetType: 'Acrylic 5mm', 
    action: 'RECEIVE', 
    stockCategory: 'RAW',
    quantity: 50, 
    details: 'Urgent Order' 
  },
  { 
    id: 'TRX-004', 
    date: '2023-10-15', 
    customerName: 'ABC Corp', 
    sheetCode: 'S-10mm', 
    sheetType: 'Steel 10mm', 
    action: 'RETURN', 
    stockCategory: 'CUT', // Returning Cut items
    quantity: 10, 
    driverName: 'John Doe',
    vehicleNumber: 'KA-01-9999',
    details: 'Gate Pass #501' 
  }
];

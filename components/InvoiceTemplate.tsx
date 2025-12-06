import React from 'react';
import { InvoiceEntry } from '../types';

interface Props {
  invoice: InvoiceEntry;
  onClose: () => void;
}

const COMPANY_INFO = {
  name: "FIRM MANAGEMENT INC.",
  address: "123 Industrial Estate, Sector 5",
  city: "Tech City, TC 560001",
  email: "accounts@firmmgmt.com",
  phone: "+1 987 654 3210"
};

const InvoiceTemplate: React.FC<Props> = ({ invoice, onClose }) => {
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex justify-center overflow-auto p-4 md:p-8 backdrop-blur-sm">
      <div className="bg-white shadow-2xl w-full max-w-[210mm] min-h-[297mm] mx-auto flex flex-col print:shadow-none print:w-full print:max-w-none print:h-auto print:absolute print:inset-0">
        
        {/* Toolbar - Hidden in Print */}
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center rounded-t-lg print:hidden sticky top-0 z-10">
          <h3 className="font-bold">Invoice Preview</h3>
          <div className="flex gap-3">
             <button onClick={onClose} className="px-4 py-2 hover:bg-slate-700 rounded text-sm">Close</button>
             <button onClick={handlePrint} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-sm font-bold flex items-center gap-2">
               Print Invoice
             </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="p-12 flex-1 flex flex-col text-slate-800 font-sans" id="invoice-content">
           
           {/* Header */}
           <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-8">
              <div>
                 <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">INVOICE</h1>
                 <div className="text-sm font-medium text-slate-500">#{invoice.id}</div>
                 <div className="inline-block mt-2 px-2 py-0.5 rounded bg-slate-100 text-xs font-bold text-slate-600 uppercase">
                    {invoice.type}
                 </div>
              </div>
              <div className="text-right">
                 <h2 className="font-bold text-xl text-slate-800 mb-1">{COMPANY_INFO.name}</h2>
                 <p className="text-sm text-slate-600">{COMPANY_INFO.address}</p>
                 <p className="text-sm text-slate-600">{COMPANY_INFO.city}</p>
                 <p className="text-sm text-slate-600 mt-2">{COMPANY_INFO.email}</p>
                 <p className="text-sm text-slate-600">{COMPANY_INFO.phone}</p>
              </div>
           </div>

           {/* Details Grid */}
           <div className="grid grid-cols-2 gap-12 mb-12">
              <div>
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Bill To</h3>
                 <div className="text-lg font-bold text-slate-900 mb-1">{invoice.customerName}</div>
                 <div className="text-slate-600 text-sm">Client Account: {invoice.customerName.replace(/\s+/g, '').toUpperCase()}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Invoice Date</h3>
                    <div className="font-medium">{invoice.date}</div>
                 </div>
                 <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Due Date</h3>
                    <div className="font-medium">On Receipt</div>
                 </div>
                 <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</h3>
                    <div className={`font-bold uppercase ${invoice.status === 'PAID' ? 'text-green-600' : 'text-amber-600'}`}>{invoice.status}</div>
                 </div>
              </div>
           </div>

           {/* Table */}
           <table className="w-full mb-8">
              <thead>
                 <tr className="bg-slate-50 border-y border-slate-200">
                    <th className="py-3 px-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="py-3 px-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-24">Unit</th>
                    <th className="py-3 px-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Unit Price</th>
                    <th className="py-3 px-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-24">Qty</th>
                    <th className="py-3 px-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Amount</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((item, idx) => (
                      <tr key={idx}>
                          <td className="py-4 px-4 font-medium text-slate-800">{item.description}</td>
                          <td className="py-4 px-4 text-center text-slate-600 text-sm">{item.unit}</td>
                          <td className="py-4 px-4 text-right text-slate-600 font-mono">${item.unitPrice.toLocaleString()}</td>
                          <td className="py-4 px-4 text-center text-slate-600 font-mono">{item.quantity}</td>
                          <td className="py-4 px-4 text-right font-bold text-slate-800 font-mono">${item.total.toLocaleString()}</td>
                      </tr>
                    ))
                 ) : (
                    <tr>
                       <td className="py-4 px-4 font-bold text-slate-800">Consolidated Charges</td>
                       <td className="py-4 px-4 text-center text-slate-600">-</td>
                       <td className="py-4 px-4 text-right text-slate-600">-</td>
                       <td className="py-4 px-4 text-center text-slate-600">1</td>
                       <td className="py-4 px-4 text-right font-bold text-slate-800">${invoice.amount.toLocaleString()}</td>
                    </tr>
                 )}
              </tbody>
              <tfoot>
                 <tr className="border-t-2 border-slate-900">
                    <td colSpan={4} className="pt-4 text-right font-black text-xl text-slate-900">Total</td>
                    <td className="pt-4 text-right font-mono font-black text-xl text-indigo-600">${invoice.amount.toLocaleString()}</td>
                 </tr>
              </tfoot>
           </table>

           {/* Footer */}
           <div className="mt-auto border-t border-slate-200 pt-8">
              <div className="flex justify-between items-end">
                 <div>
                    <h4 className="font-bold text-slate-800 mb-2">Payment Info</h4>
                    <p className="text-sm text-slate-600">Bank: Chase Bank</p>
                    <p className="text-sm text-slate-600">Acct: 1234 5678 9000</p>
                    <p className="text-sm text-slate-600">Routing: 987654321</p>
                 </div>
                 <div className="text-right">
                    <div className="text-4xl font-signature text-slate-400 mb-2">Authorized Sig.</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Authorized Signatory</div>
                 </div>
              </div>
              <div className="text-center text-xs text-slate-400 mt-12">
                 Thank you for your business!
              </div>
           </div>

        </div>
      </div>
    </div>
  );
};

export default InvoiceTemplate;
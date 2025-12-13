export const downloadCSV = (
  data: any[], 
  filename: string, 
  title: string, 
  dateRangeText: string
) => {
  if (!data || data.length === 0) {
    alert("No data to export");
    return;
  }

  // Define Standard Header
  const appHeader = `FM by QK\nReport: ${title}\nDate Filter: ${dateRangeText}\nGenerated: ${new Date().toLocaleString()}\n\n`;

  // Get keys from first object, but prioritize specific columns if this is cashflow
  let headers = Object.keys(data[0]);
  
  // Custom Column Ordering for CashFlow
  if (title.includes("Cash Flow")) {
     // Ensure order: Date, Category(Main), SubCategory, Description, Income, Expense, Balance
     const desiredOrder = ['date', 'category', 'subCategory', 'description', 'income', 'expense', 'balance'];
     // Filter out keys that might be internal IDs unless needed, and sort
     headers = desiredOrder.filter(k => headers.includes(k) || k === 'balance' || k === 'income' || k === 'expense');
  } else if (title.includes("Invoices")) {
     const desiredOrder = ['id', 'date', 'customerName', 'reference', 'type', 'amount', 'status'];
     headers = desiredOrder.filter(k => headers.includes(k));
  }

  const csvContent = appHeader + [
    headers.map(h => h.toUpperCase()).join(','), // CSV Header row
    ...data.map(row => 
      headers.map(header => {
        let val = row[header];
        
        if (val === null || val === undefined) {
          return '';
        }

        if (typeof val === 'object') {
           if (Array.isArray(val)) {
             val = val.map((v: any) => {
                if (v.description) return `${v.description} (${v.quantity}x${v.unitPrice})`;
                return JSON.stringify(v);
             }).join('; ');
           } else {
             val = JSON.stringify(val);
           }
        }

        val = String(val);
        // Escape quotes
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const printData = (title: string, data: any[], dateRangeText: string) => {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .app-name { font-size: 24px; font-weight: bold; }
            .report-name { font-size: 18px; margin-top: 5px; }
            .meta { font-size: 12px; color: #666; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="app-name">FM by QK</div>
            <div class="report-name">${title}</div>
            <div class="meta">Filter: ${dateRangeText} | Generated: ${new Date().toLocaleString()}</div>
          </div>
          <table>
            <thead>
              <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  ${headers.map(h => {
                    let cellData = row[h];
                    if (typeof cellData === 'object' && cellData !== null) {
                         if (Array.isArray(cellData)) {
                             cellData = cellData.map((v: any) => v.description ? v.description : JSON.stringify(v)).join(', ');
                         } else {
                             cellData = JSON.stringify(cellData);
                         }
                    }
                    return `<td>${cellData !== null && cellData !== undefined ? cellData : ''}</td>`
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
};
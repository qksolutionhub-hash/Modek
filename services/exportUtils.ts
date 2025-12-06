export const downloadCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    alert("No data to export");
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const val = row[header];
        // Handle strings with commas or newlines by wrapping in quotes
        return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(',')
    )
  ].join('\n');

  // Trigger download
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

export const printData = (title: string, data: any[]) => {
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
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            h1 { font-size: 18px; margin-bottom: 10px; }
            .meta { font-size: 10px; color: #666; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>${title} Report</h1>
          <div class="meta">Generated on ${new Date().toLocaleString()}</div>
          <table>
            <thead>
              <tr>${headers.map(h => `<th>${h.toUpperCase()}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  ${headers.map(h => `<td>${row[h] !== null && row[h] !== undefined ? row[h] : ''}</td>`).join('')}
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

export const filterByDateRange = (data: any[], dateField: string, range: 'ALL' | 'WEEK' | 'MONTH' | 'YEAR') => {
  if (range === 'ALL') return data;
  
  const now = new Date();
  const cutoff = new Date();
  
  if (range === 'WEEK') cutoff.setDate(now.getDate() - 7);
  if (range === 'MONTH') cutoff.setMonth(now.getMonth() - 1);
  if (range === 'YEAR') cutoff.setFullYear(now.getFullYear() - 1);

  return data.filter(item => {
    const itemDate = new Date(item[dateField]);
    return itemDate >= cutoff;
  });
};

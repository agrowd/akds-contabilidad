import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Export data to Excel
 */
export function exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1') {
  if (!data || data.length === 0) {
    alert('No hay datos para exportar.');
    return;
  }
  
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export data to PDF using jspdf-autotable
 */
export function exportToPDF(data: any[], filename: string, title: string, columns: { header: string, dataKey: string }[]) {
  if (!data || data.length === 0) {
    alert('No hay datos para exportar.');
    return;
  }

  const doc = new jsPDF('landscape');
  
  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  // Date subtitle
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Fecha de exportación: ${new Date().toLocaleDateString()}`, 14, 30);

  // AutoTable
  autoTable(doc, {
    startY: 35,
    columns: columns,
    body: data,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    styles: { fontSize: 8, cellPadding: 2 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  doc.save(`${filename}.pdf`);
}

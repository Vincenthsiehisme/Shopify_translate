import * as XLSX from 'https://esm.sh/xlsx@0.18.5';
import { MovaExcelRow } from '../types.ts';

export const generateAndDownloadExcel = (data: MovaExcelRow[], filename: string) => {
  // Create a new workbook
  const wb = XLSX.utils.book_new();

  // Create worksheet
  // Note: We use skipHeader because our data is array-of-arrays without keys
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Append worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, "Orders");

  // Write and trigger download
  XLSX.writeFile(wb, filename);
};

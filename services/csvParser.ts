import Papa from 'https://esm.sh/papaparse@5.4.1';
import { ShopifyOrderRow } from '../types.ts';

export const parseShopifyCSV = (file: File): Promise<ShopifyOrderRow[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      // Critical fix: Strip BOM (\ufeff) and whitespace from headers
      transformHeader: (header) => header.replace(/^\ufeff/, '').trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn('CSV Parse Warnings:', results.errors);
        }
        
        const rows = results.data as ShopifyOrderRow[];

        // Basic validation
        if (rows.length === 0) {
            reject(new Error('檔案內容為空'));
            return;
        }

        // Check if 'Name' column exists in the first row (Shopify's Order ID column)
        if (!('Name' in rows[0])) {
            const detectedKeys = Object.keys(rows[0]).join(', ');
            reject(new Error(`CSV 格式錯誤: 找不到 "Name" 欄位。請確認上傳的是 Shopify 訂單匯出檔。\n偵測到的欄位: ${detectedKeys}`));
            return;
        }
        
        resolve(rows);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};
import React, { useState, useCallback } from 'https://esm.sh/react@18.3.1';
import { Upload, FileDown, AlertCircle, CheckCircle, Loader2, FileSpreadsheet } from 'https://esm.sh/lucide-react@0.284.0?deps=react@18.3.1';
import { parseShopifyCSV } from './services/csvParser.ts';
import { processOrders, convertToMovaRows } from './services/orderLogic.ts';
import { generateAndDownloadExcel } from './services/excelGenerator.ts';
import { ProcessedOrder } from './types.ts';

// Simple Alert Component
const Alert = ({ type, message }: { type: 'error' | 'success', message: string }) => (
  <div className={`p-4 rounded-md flex items-center gap-3 ${type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
    {type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
    <span>{message}</span>
  </div>
);

export default function App() {
  const [dateToken, setDateToken] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ orders: number, items: number } | null>(null);
  const [processedData, setProcessedData] = useState<any[] | null>(null);

  const handleDateTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers
    const val = e.target.value.replace(/\D/g, '');
    setDateToken(val);
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Reset state
    setError(null);
    setStats(null);
    setProcessedData(null);
    
    if (!dateToken) {
        setError('請先輸入日期 (例如: 202310)');
        e.target.value = ''; // Reset input
        return;
    }

    if (!dateToken.match(/^\d{4,8}$/)) {
         setError('日期格式錯誤，請輸入 4 到 8 位數字 (例如 YYYYMMDD)');
         e.target.value = '';
         return;
    }

    setIsProcessing(true);

    try {
      // 1. Parse
      const rawRows = await parseShopifyCSV(file);
      
      // 2. Logic Process
      const orders = processOrders(rawRows);
      
      // 3. Convert to Excel Format
      const excelRows = convertToMovaRows(orders);

      setStats({
        orders: orders.length,
        items: Math.max(0, excelRows.length - 1) // Subtract header row
      });
      setProcessedData(excelRows);

    } catch (err: any) {
      console.error(err);
      setError(err.message || '處理檔案時發生未知錯誤');
    } finally {
      setIsProcessing(false);
    }
  }, [dateToken]);

  const handleDownload = () => {
    if (!processedData || !dateToken) return;
    const filename = `MOVA訂單_${dateToken}.xlsx`;
    generateAndDownloadExcel(processedData, filename);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
             <FileSpreadsheet className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            MOVA 訂單轉換系統
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Shopify CSV 轉 Excel (自動計算運費門檻)
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 space-y-6">
          
          {/* Step 1: Date Token Input */}
          <div>
            <label htmlFor="date_token" className="block text-sm font-medium text-gray-700">
              1. 輸入日期
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="text"
                name="date_token"
                id="date_token"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-4 pr-12 sm:text-sm border-gray-300 rounded-md py-3 border"
                placeholder="例如: 20231027"
                value={dateToken}
                onChange={handleDateTokenChange}
                maxLength={8}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">將用於輸出檔名與 Excel 內容</p>
          </div>

          {/* Step 2: Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              2. 上傳 Shopify CSV
            </label>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="file-upload"
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  !dateToken 
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50' 
                    : 'border-blue-300 bg-blue-50 hover:bg-blue-100'
                }`}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {isProcessing ? (
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8 text-blue-500 mb-2" />
                  )}
                  <p className="text-sm text-gray-500">
                    {isProcessing ? '處理中...' : '點擊或拖曳檔案至此'}
                  </p>
                </div>
                <input 
                    id="file-upload" 
                    type="file" 
                    className="hidden" 
                    accept=".csv"
                    onChange={handleFileUpload}
                    disabled={!dateToken || isProcessing}
                />
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && <Alert type="error" message={error} />}

          {/* Success / Stats Area */}
          {stats && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 animate-fade-in">
              <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                <CheckCircle size={18} />
                <span>轉換成功！</span>
              </div>
              <ul className="text-sm text-green-700 space-y-1 ml-6 list-disc">
                <li>處理訂單數: <strong>{stats.orders}</strong> 筆</li>
                <li>產生資料行: <strong>{stats.items}</strong> 行</li>
              </ul>
              
              <button
                onClick={handleDownload}
                className="mt-4 w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <FileDown size={18} />
                下載 Excel ({`MOVA訂單_${dateToken}.xlsx`})
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
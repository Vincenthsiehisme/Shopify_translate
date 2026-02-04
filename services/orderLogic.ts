import { ShopifyOrderRow, ProcessedOrder, ProcessedItem, MovaExcelRow } from '../types.ts';

// Helper to clean phone numbers (remove non-digits, ensure string, format to 09xx)
const cleanPhone = (phone: string): string => {
  if (!phone) return '';
  
  // 1. Remove all non-digits (removes +, -, spaces)
  let p = phone.replace(/[^\d]/g, '');

  // 2. Handle country code 886 replacement (8869xx -> 09xx)
  if (p.startsWith('886')) {
    p = '0' + p.substring(3);
  }

  // 3. Ensure leading zero for mobile numbers (e.g. 912345678 -> 0912345678)
  if (p.startsWith('9') && p.length === 9) {
    p = '0' + p;
  }

  return p;
};

// Helper to get address - strictly uses Shipping Street as requested
const formatAddress = (row: ShopifyOrderRow): string => {
  const shippingStreet = row['Shipping Street'];
  const billingStreet = row['Billing Street'];
  
  // User explicitly requested Shipping Street
  if (shippingStreet) return shippingStreet.trim();
  
  // Fallback
  return billingStreet || '';
};

// Helper to parse invoice info from Note Attributes
const parseInvoiceInfo = (attrs: string | undefined) => {
  if (!attrs) return { taxId: '', companyName: '' };
  
  // 1. Check Invoice Type first
  // Match "發票種類(InvoiceType): <word>"
  // Regex looks for the key, ignores whitespace around colon, captures text until newline
  const typeMatch = attrs.match(/發票種類\(InvoiceType\):\s*([^\n\r]+)/);
  const invoiceType = typeMatch ? typeMatch[1].trim().toLowerCase() : '';

  // 2. Only proceed if type is 'company' (case-insensitive check)
  if (invoiceType !== 'company') {
    return { taxId: '', companyName: '' };
  }

  // 3. If company, proceed to match ID and Name
  // Match "統一編號(CompanyId): <digits>"
  const taxIdMatch = attrs.match(/統一編號\(CompanyId\):\s*(\d+)/);
  // Match "公司名稱(CompanyName): <text until newline>"
  const nameMatch = attrs.match(/公司名稱\(CompanyName\):\s*([^\n\r]+)/);
  
  return {
    taxId: taxIdMatch ? taxIdMatch[1].trim() : '',
    companyName: nameMatch ? nameMatch[1].trim() : ''
  };
};

export const processOrders = (rows: ShopifyOrderRow[]): ProcessedOrder[] => {
  const orderMap = new Map<string, ProcessedOrder>();

  rows.forEach((row) => {
    const orderId = row.Name;
    if (!orderId) return;

    // Initialize Order if not exists
    if (!orderMap.has(orderId)) {
      const shippingName = row['Shipping Name'] || row['Billing Name'] || 'Unknown';
      const shippingPhone = cleanPhone(row['Shipping Phone'] || row['Billing Phone']);
      const shippingMethod = row['Shipping Method'] || '';
      // Extract Payment References (Try plural first as per user CSV, fallback to singular)
      const paymentRef = row['Payment References'] || row['Payment Reference'] || '';
      // Carrier Number now comes directly from Email as per user request
      const carrierId = row.Email || '';
      
      // Parse Note Attributes for Tax Info
      const { taxId, companyName } = parseInvoiceInfo(row['Note Attributes']);

      orderMap.set(orderId, {
        orderId,
        shopifyId: row.Id || '',
        paymentRef,
        carrierId,
        taxId,
        companyName,
        email: row.Email,
        createdAt: row['Created at'],
        shippingMethod,
        customer: {
          name: shippingName,
          phone: shippingPhone,
          address: formatAddress(row),
          city: row['Shipping City'] || row['Billing City'] || '',
          zip: row['Shipping Zip'] || row['Billing Zip'] || '',
        },
        items: [],
        subtotal: 0,
        originalSubtotal: parseFloat(row.Subtotal || '0'),
        shippingFee: parseFloat(row.Shipping || '0'),
        total: parseFloat(row.Total || '0'),
        warnings: [],
      });
    }

    const order = orderMap.get(orderId)!;

    // Parse Line Item
    const qty = parseInt(row['Lineitem quantity'] || '0', 10);
    const price = parseFloat(row['Lineitem price'] || '0');
    const name = row['Lineitem name'];
    const sku = row['Lineitem sku'];

    if (name) {
      order.items.push({
        sku: sku || '',
        name: name,
        quantity: qty,
        price: price,
      });
    }
  });

  // Post-processing: Calculate totals and apply Business Rules
  const processedOrders: ProcessedOrder[] = [];

  orderMap.forEach((order) => {
    // 1. Calculate Real Subtotal from items
    const calculatedSubtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    order.subtotal = calculatedSubtotal;

    // 2. Shipping Threshold Logic (PDF Rule: < 1000 add Z90001)
    if (order.subtotal < 1000) {
      order.items.push({
        sku: 'Z90001',
        name: '運費',
        quantity: 1,
        price: 120,
        isSystemAddon: true,
      });
    }

    processedOrders.push(order);
  });

  return processedOrders;
};

// Updated Headers based on User Screenshot
const MOVA_HEADERS = [
  '通路訂單編號', // 0
  '收貨人',       // 1
  '聯絡電話',     // 2
  '送貨地址',     // 3
  '備註',         // 4
  '品號',         // 5
  '金額合計',     // 6
  '數量',         // 7
  '單價',         // 8
  '出貨倉庫',     // 9
  '統一編號',     // 10
  '代收貨款',     // 11
  '業務員',       // 12
  '來回件',       // 13
  '附件',         // 14
  '運輸方式',     // 15
  '指定效期',     // 16
  '客戶品號',     // 17
  'ERP客戶代號',  // 18
  '是否指定倉庫', // 19
  '發票號碼',     // 20
  '載具號碼',     // 21
  '發票開立日期', // 22
  '發票開立時間', // 23
  '統一編號(發票)',// 24
  '統一編號抬頭', // 25
  '通路訂單序號', // 26
  '網站訂單編號', // 27
  'Email'        // 28
];

export const convertToMovaRows = (orders: ProcessedOrder[]): MovaExcelRow[] => {
  // Initialize with headers
  const exportRows: MovaExcelRow[] = [MOVA_HEADERS];

  orders.forEach((order) => {
    order.items.forEach((item) => {
      const row: MovaExcelRow = Array(29).fill('');

      // Use Payment Reference for Channel Order ID, fallback to Shopify Order Name if missing
      row[0] = order.paymentRef || order.orderId; // 通路訂單編號
      
      row[1] = order.customer.name;        // 收貨人
      row[2] = order.customer.phone;       // 聯絡電話
      row[3] = order.customer.address;     // 送貨地址 (Strictly Shipping Street)
      row[4] = '';                         // 備註 (Set to Empty as requested)
      row[5] = item.sku;                   // 品號
      row[6] = item.price * item.quantity; // 金額合計 (Line Total)
      row[7] = item.quantity;              // 數量
      row[8] = item.price;                 // 單價
      
      // Constants fixed by user request
      row[9] = 'XF1400';                   // 出貨倉庫
      
      row[10] = '';                        // 統一編號
      row[11] = '';                        // 代收貨款 (Set to Empty as requested)
      
      row[12] = '6301';                    // 業務員
      row[13] = 'N';                       // 來回件
      row[14] = 'N';                       // 附件 (復健)
      row[15] = '2';                       // 運輸方式 (Fixed to 2)
      
      row[16] = '';                        // 指定效期
      row[17] = item.sku;                  // 客戶品號 (Same as SKU)
      
      row[18] = 'F91000000';               // ERP客戶代號
      row[19] = 'N';                       // 是否指定倉庫
      
      row[20] = '';                        // 發票號碼
      row[21] = order.carrierId;           // 載具號碼
      row[22] = '';                        // 發票開立日期
      row[23] = '';                        // 發票開立時間
      row[24] = order.taxId || '';         // 統一編號(發票) (CompanyId from Note Attributes)
      row[25] = order.companyName || '';   // 統一編號抬頭 (CompanyName from Note Attributes)
      
      // Swapped based on user request
      row[26] = order.orderId;             // 通路訂單序號 (Change to Name, e.g. MOVA-xxxx)
      row[27] = order.shopifyId;           // 網站訂單編號 (Change to Internal ID, e.g. 5623...)
      
      row[28] = order.email;               // Email

      exportRows.push(row);
    });
  });

  return exportRows;
};
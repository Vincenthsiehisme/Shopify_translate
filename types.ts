
export interface ShopifyOrderRow {
  Id: string; // Added Shopify internal ID
  Name: string;
  Email: string;
  'Financial Status': string;
  'Paid at': string;
  'Fulfillment Status': string;
  'Fulfilled at': string;
  'Accepts Marketing': string;
  Currency: string;
  Subtotal: string;
  Shipping: string;
  Taxes: string;
  Total: string;
  'Discount Code': string;
  'Discount Amount': string;
  'Shipping Method': string;
  'Created at': string;
  'Lineitem quantity': string;
  'Lineitem name': string;
  'Lineitem price': string;
  'Lineitem compare at price': string;
  'Lineitem sku': string;
  'Lineitem requires shipping': string;
  'Lineitem taxable': string;
  'Lineitem fulfillment status': string;
  'Billing Name': string;
  'Billing Street': string;
  'Billing Address1': string;
  'Billing Address2': string;
  'Billing Company': string;
  'Billing City': string;
  'Billing Zip': string;
  'Billing Province': string;
  'Billing Country': string;
  'Billing Phone': string;
  'Shipping Name': string;
  'Shipping Street': string;
  'Shipping Address1': string;
  'Shipping Address2': string;
  'Shipping Company': string;
  'Shipping City': string;
  'Shipping Zip': string;
  'Shipping Province': string;
  'Shipping Country': string;
  'Shipping Phone': string;
  Notes?: string;
  'Note Attributes'?: string;
  'Payment Method'?: string;
  [key: string]: string | undefined; // Allow loose indexing for flexibility
}

// Internal structured representation of an order
export interface ProcessedOrder {
  orderId: string; // The "Name" (e.g., MOVA-1116)
  shopifyId: string; // The internal "Id" (e.g., 6274...)
  paymentRef: string; // Added to store Payment References
  carrierId: string; // Parsed from Note Attributes
  taxId?: string; // Parsed from Note Attributes (CompanyId)
  companyName?: string; // Parsed from Note Attributes (CompanyName)
  email: string;
  createdAt: string;
  shippingMethod: string;
  customer: {
    name: string;
    phone: string;
    address: string;
    city: string;
    zip: string;
  };
  items: ProcessedItem[];
  subtotal: number; // Calculated from lines
  originalSubtotal: number; // From CSV
  shippingFee: number;
  total: number;
  warnings: string[];
}

export interface ProcessedItem {
  sku: string;
  name: string;
  quantity: number;
  price: number;
  isSystemAddon?: boolean; // e.g. Shipping fee item
}

// 29-Column Structure
export type MovaExcelRow = (string | number)[];

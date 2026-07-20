export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number | null;
  stockQuantity: number;
  imageUrl?: string;
  deliveryTime?: string;
  vendor: { id: string; name: string };
  category: { id: string; name: string };
  isAdminStore?: boolean;
  priceOnRequest?: boolean;
  priceUnlock?: {
    id: string;
    status: string;
    unlockedPrice: number | null;
    ownerCounterPrice: number | null;
    validUntil: string | null;
    isExpired: boolean;
    quantity: number | null;
  } | null;
  canPurchase?: boolean;
}

export interface Category {
  id: string;
  name: string;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
}

export interface VendorPaymentInfo {
  vendorName: string;
  paymentQrCodeUrl?: string;
  paymentUpiId?: string;
  paymentAccountName?: string;
  useRazorpay?: boolean;
}

export interface PaymentRecord {
  id: string;
  vendorId: string;
  totalAmount: number;
  items: Array<{ productId: string; qty: number; priceSnapshot: number; name: string }>;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  rejectionReason?: string;
  createdAt: string;
  vendor: { id: string; name: string };
  order?: { id: string; status: string } | null;
}

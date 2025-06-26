// src/types.ts

import type { Timestamp } from 'firebase/firestore';

/**
 * @description 상품 판매 방식
 */
export type SalesType = 'PRE_ORDER_UNLIMITED' | 'IN_STOCK';

/**
 * @description 상품의 보관 타입
 */
export type StorageType = 'ROOM' | 'CHILLED' | 'FROZEN'; // 추가: 실온, 냉장, 냉동

/**
 * @description 상품의 가격 옵션
 */
export interface PricingOption {
  unit: string;
  price: number;
}

/**
 * @description Firestore `products` 컬렉션의 문서 타입
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  pricingOptions: PricingOption[];
  imageUrls: string[];
  category?: string;
  subCategory?: string;
  storageType: StorageType; // 추가: 보관 타입

  // 판매 및 재고 정보
  salesType: SalesType;
  initialStock: number;
  stock: number; // 현재 남은 재고
  maxOrderPerPerson?: number | null; // null도 허용하도록 변경

  // 상태 및 날짜 정보
  status: 'draft' | 'selling' | 'scheduled' | 'sold_out' | 'ended';
  isPublished: boolean;
  publishAt: Timestamp;
  deadlineDate: Timestamp;
  arrivalDate: Timestamp;

  pickupDate?: Timestamp;
  pickupDeadlineDate?: Timestamp | null; // null도 허용하도록 변경
  expirationDate?: Timestamp | null; // null도 허용하도록 변경
  publishDate?: Timestamp; // Product에는 publishDate가 publishAt으로 정의되어 있었으므로 확인 필요. ProductAddAdminPage에는 publishAt만 사용됨.

  // 메타 정보
  encoreCount: number;
  isNew: boolean;
  createdAt: Timestamp;
  specialLabels?: string[];
  isAvailableForOnsiteSale?: boolean;
}

/**
 * @description 주문 내 포함된 개별 상품 정보
 */
export interface OrderItem {
    id: string;
    name: string;
    quantity: number;
    price: number;
    unit: string;
    category?: string;
    subCategory?: string;
}

/**
 * @description 장바구니에 담기는 개별 상품 정보
 */
export interface CartItem {
  productId: string;
  productName: string;
  selectedUnit: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string;
  maxOrderPerPerson?: number | null; // null도 허용하도록 변경
  availableStock: number;
  salesType: SalesType;
}

/**
 * @description Firestore `orders` 컬렉션의 문서 타입
 */
export interface Order {
    id: string;
    userId: string;
    customerName: string;
    items: OrderItem[];
    totalPrice: number;
    orderDate: Timestamp;
    status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
    pickupDate?: Timestamp;
    pickupDeadlineDate?: Timestamp;
    customerPhoneLast4?: string;
}

/**
 * @description 배너 정보 타입 정의
 */
export interface Banner {
  id: string;
  imageUrl: string;
  linkTo?: string;
  order: number;
  createdAt: Timestamp;
  isActive: boolean;
}

/**
 * @description DailyDashboardModal을 위한 타입 정의
 */
export interface TodayStockItem {
  id: string;
  name: string;
  quantity: number;
}

export interface TodayOrderItem {
  id: string;
  customerName: string;
  productName: string;
  quantity: number;
  status: string;
}

/**
 * @description Firestore `categories` 컬렉션의 문서 타입
 */
export interface Category {
  id: string;
  name: string;
  subCategories: string[];
}

/**
 * @description ProductPreviewModal에 전달될 상품 데이터 타입
 */
export interface PreviewProduct {
  name: string;
  description: string;
  pricingOptions: PricingOption[];
  specialLabels: string[];
  category?: string;
  subCategory?: string;
}

// [추가됨] 매장 정보 타입 정의
export interface StoreInfo {
  name: string;
  businessNumber: string;
  representative: string;
  address: string;
  phoneNumber: string;
  email: string;
  operatingHours: string[];
  description: string;
}
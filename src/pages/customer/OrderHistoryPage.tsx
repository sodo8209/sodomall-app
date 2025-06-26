// src/pages/customer/OrderHistoryPage.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import { getUserOrders } from '../../firebase'; // FIX: import 경로 수정
import type { Order, OrderItem } from '../../types';
import './OrderHistoryPage.css';

// OrderItem에 category와 subCategory를 추가한 타입
interface OrderItemWithCategory extends OrderItem {
  category?: string;
  subCategory?: string;
}

const OrderHistoryPage: React.FC = () => {
  const { user, notifications = [], handleMarkAsRead = () => {} } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* 주문 불러오기 */
  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) {
        setLoading(false);
        setError('로그인이 필요합니다.');
        return;
      }
      setLoading(true);
      setError(null);

      try {
        const fetchedOrders = await getUserOrders(user.uid);
        setOrders(fetchedOrders);
      } catch (err) {
        console.error("예약 내역 불러오기 오류:", err);
        setError('예약 내역을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  // 주문 상태를 판별하여 표시할 텍스트와 스타일 클래스를 반환하는 헬퍼 함수
  const getOrderStatusDisplay = (order: Order) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const pickupDeadline = order.pickupDeadlineDate?.toDate();
    const isPickupDeadlinePassed = pickupDeadline && pickupDeadline.getTime() < now.getTime();

    switch (order.status) {
      case 'cancelled':
        return { text: '예약 취소', className: 'status-cancelled' };
      case 'delivered':
        return { text: '픽업 완료', className: 'status-delivered' };
      case 'paid':
        if (isPickupDeadlinePassed) {
          return { text: '노쇼', className: 'status-noshow' };
        }
        return { text: '선입금 완료', className: 'status-paid' };
      case 'pending':
        if (isPickupDeadlinePassed) {
          return { text: '노쇼', className: 'status-noshow' };
        }
        return { text: '예약중', className: 'status-pending' };
      default:
        return { text: order.status, className: '' };
    }
  };


  /* ───── 렌더링 ───── */

  const Body = () => {
    if (loading) return <p className="loading-message">예약 내역을 불러오는 중…</p>;
    if (error) return <p className="error-message">{error}</p>;
    if (orders.length === 0) return <p className="no-orders-message">예약 내역이 없습니다.</p>;

    return (
      <div className="order-history-list">
        {orders.map((order: Order) => { // FIX: order에 타입 명시
          const statusDisplay = getOrderStatusDisplay(order);
          return (
            <div key={order.id} className="order-card">
              <div className="order-header-section">
                <span className="order-date">
                  주문일: {order.orderDate?.toDate().toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }) || '날짜 없음'}
                </span>
                <span className={`order-status-badge ${statusDisplay.className}`}>{statusDisplay.text}</span>
              </div>

              <ul className="order-items-detail-list">
                {(order.items as OrderItemWithCategory[] || []).map((item: OrderItemWithCategory, idx: number) => ( // FIX: item 및 idx에 타입 명시
                  <li key={idx} className="order-item-detail-row">
                    <span className="product-name-qty">{item.name}</span>
                    <span className="product-category">
                        [{item.category || '기타'}]
                        {item.subCategory && ` (${item.subCategory})`}
                    </span>
                    <span className="product-quantity-display">{item.quantity}개</span>
                    <span className="product-price">{(item.price * item.quantity).toLocaleString()}원</span>
                  </li>
                ))}
              </ul>

              <div className="order-footer-section">
                <span className="order-total-price">총 예약 금액: {order.totalPrice.toLocaleString()}원</span>
                <span className="order-pickup-info">
                    픽업 예정일: {order.pickupDate?.toDate().toLocaleDateString() || '미정'}
                    {order.pickupDeadlineDate && ` (마감: ${order.pickupDeadlineDate.toDate().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })})`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Header
        title="예약 내역"
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
      />
      <div className="customer-page-container">
        <Body />
      </div>
    </>
  );
};

export default OrderHistoryPage;
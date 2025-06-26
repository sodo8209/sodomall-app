// src/components/customer/OrderCalendar.tsx

import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './OrderCalendar.css';
import { useAuth } from '../../context/AuthContext';
import { getUserOrders } from '../../firebase'; // FIX: import 경로 수정
import type { Order, OrderItem } from '../../types';
import Header from '../Header';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface OrderItemWithCategory extends OrderItem {
    category?: string;
}

const OrderCalendar: React.FC = () => {
  const { user } = useAuth();
  const [value, onChange] = useState<Value>(new Date());
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (user?.uid) {
        setIsLoading(true);
        setError(null);
        try {
          const orders = await getUserOrders(user.uid);
          setUserOrders(orders);
        } catch (err) {
          console.error("사용자 주문 내역 불러오기 오류:", err);
          setError("주문 내역을 불러오는 데 실패했습니다.");
          setUserOrders([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
        setError("로그인한 사용자 정보가 없습니다. 주문 내역을 볼 수 없습니다.");
        setUserOrders([]);
      }
    };

    fetchOrders();
  }, [user]);

  const getOrderStatusDisplay = (order: Order) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // 시간 정보 제거

    const pickupDeadline = order.pickupDeadlineDate?.toDate();
    const isPickupDeadlinePassed = pickupDeadline && pickupDeadline.getTime() < now.getTime();

    // 우선순위: 취소 > 노쇼 > 픽업 완료 > 선입금 > 예약중
    if (order.status === 'cancelled') {
        return { text: '취소', className: 'status-cancelled' };
    }
    // '노쇼'는 마감일이 지났고, 픽업되지 않은 경우
    if (order.status !== 'delivered' && isPickupDeadlinePassed) {
        return { text: '노쇼', className: 'status-cancelled' }; // 노쇼는 취소와 같은 색상 사용
    }
    if (order.status === 'delivered') {
        return { text: '픽업 완료', className: 'status-delivered' };
    }
    if (order.status === 'paid') {
        return { text: '선입금', className: 'status-paid' };
    }
    if (order.status === 'pending') {
        return { text: '예약중', className: 'status-pending' };
    }
    return { text: order.status, className: '' };
  };


  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const hasOrder = userOrders.some((order: Order) => { // FIX: order에 타입 명시
        const orderDate = order.orderDate?.toDate();
        const pickupDate = order.pickupDate?.toDate(); // 픽업일도 고려하여 점 찍기
        return (orderDate &&
               orderDate.getFullYear() === date.getFullYear() &&
               orderDate.getMonth() === date.getMonth() &&
               orderDate.getDate() === date.getDate()) ||
               (pickupDate &&
               pickupDate.getFullYear() === date.getFullYear() &&
               pickupDate.getMonth() === date.getMonth() &&
               pickupDate.getDate() === date.getDate());
      });
      return hasOrder ? <div className="dot"></div> : null;
    }
    return null;
  };

  const selectedDateOrders = Array.isArray(value) && value[0]
    ? userOrders.filter((order: Order) => { // FIX: order에 타입 명시
        const selectedSingleDate = value[0] as Date;
        const orderDate = order.orderDate?.toDate();
        const pickupDate = order.pickupDate?.toDate();

        return (orderDate &&
               orderDate.getFullYear() === selectedSingleDate.getFullYear() &&
               orderDate.getMonth() === selectedSingleDate.getMonth() &&
               orderDate.getDate() === selectedSingleDate.getDate()) ||
               (pickupDate &&
               pickupDate.getFullYear() === selectedSingleDate.getFullYear() &&
               pickupDate.getMonth() === selectedSingleDate.getMonth() &&
               pickupDate.getDate() === selectedSingleDate.getDate());
      })
    : [];

  return (
    <>
      <Header title="나의 주문 캘린더" />
      <div className="order-calendar-page-container">
        {isLoading ? (
          <div className="loading-message">주문 내역을 불러오는 중...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <>
            <div className="calendar-wrapper">
              <Calendar
                onChange={onChange}
                value={value}
                locale="ko-KR"
                tileContent={tileContent}
                formatDay={(_locale: string | undefined, date: Date) => date.getDate().toString()}
              />
            </div>

            <div className="order-list-section">
              <h3>{Array.isArray(value) && value[0] ? (value[0] as Date).toLocaleDateString() : '날짜를 선택하세요'} 주문 내역</h3>
              {selectedDateOrders.length > 0 ? (
                <ul className="order-list">
                  {selectedDateOrders.map((order: Order) => { // FIX: order에 타입 명시
                    const statusDisplay = getOrderStatusDisplay(order);
                    return (
                      <li key={order.id} className="order-item-card">
                        <div className="order-summary">
                            <p className="order-date">주문일: {order.orderDate?.toDate().toLocaleDateString() || '날짜 없음'}</p>
                            <p className={`order-status ${statusDisplay.className}`}>{statusDisplay.text}</p>
                        </div>
                        <ul className="order-items-detail">
                            {(order.items as OrderItemWithCategory[] || []).map((item: OrderItemWithCategory, idx: number) => ( // FIX: item 및 idx에 타입 명시
                                <li key={idx} className="order-item-detail-row">
                                    <span className="product-name-qty">{item.name} ({item.quantity}개)</span>
                                    <span className="product-category">[{item.category || '기타'}]</span>
                                    <span className="product-price">{item.price.toLocaleString()}원</span>
                                </li>
                            ))}
                        </ul>
                        <p className="order-total-price">총 금액: {order.totalPrice.toLocaleString()}원</p>
                        <p className="order-pickup-info">
                            픽업 예정일: {order.pickupDate?.toDate().toLocaleDateString() || '미정'}
                            {order.pickupDeadlineDate && ` (마감: ${order.pickupDeadlineDate.toDate().toLocaleDateString()})`}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="no-orders-message">선택된 날짜에 주문이 없습니다.</p>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default OrderCalendar;
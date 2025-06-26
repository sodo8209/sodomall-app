import React, { useState } from 'react';
import { searchOrdersByPhoneNumber, updateOrderStatus } from '../../firebase'; // FIX: import 경로 수정
import type { Order, OrderItem } from '../../types';
import { Search, Phone, CheckCircle, XCircle, DollarSign, Loader } from 'lucide-react';

// 개별 주문 상품 아이템을 표시하는 컴포넌트
interface OrderItemDisplayProps {
  item: OrderItem;
}

const OrderItemDisplay: React.FC<OrderItemDisplayProps> = ({ item }) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: '1px dashed #eee'
    }}>
      <span>{item.name}</span>
      <span>{item.quantity}개</span>
    </div>
  );
};

// 주문 카드 컴포넌트
interface OrderCardProps {
  order: Order;
  onSelect: (orderId: string) => void;
  isSelected: boolean;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onSelect, isSelected }) => {
  const {
    id,
    status,
    orderDate,
    customerName,
    pickupDate,
    items = [],
    totalPrice
  } = order;

  const statusColor = (statusValue: string) => {
    switch (statusValue) {
      case 'paid': return '#fffbe6';
      case 'pending': return '#e3f2fd';
      case 'delivered': return '#e8f5e9';
      case 'cancelled': return '#ffebee';
      default: return 'white';
    }
  };

  const statusText = (statusValue: string) => {
    switch (statusValue) {
      case 'paid': return '선입금';
      case 'pending': return '예약';
      case 'delivered': return '픽업완료';
      case 'cancelled': return '노쇼/취소';
      default: return '알 수 없음';
    }
  };

  return (
    <div
      style={{
        backgroundColor: statusColor(status),
        border: isSelected ? '2px solid #007bff' : '2px solid transparent',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        width: '90%',
        minWidth: '280px',
        maxWidth: '300px',
        userSelect: 'none',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
      onClick={() => onSelect(id)}
    >
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', color: '#333' }}>
          <span>주문일: {orderDate ? new Date(orderDate.seconds * 1000).toLocaleDateString() : '날짜 없음'}</span>
          <span style={{ fontWeight: 'bold', color: '#007bff' }}>{statusText(status)}</span>
        </div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '10px 0 5px' }}>{customerName} 님</h3>
        <div style={{ fontSize: '0.9rem', color: '#555', marginBottom: '10px' }}>
          픽업 예정일: {pickupDate ? new Date(pickupDate.seconds * 1000).toLocaleDateString() : '미정'}
        </div>
        <div style={{ borderTop: '1px solid #eee', paddingTop: '10px' }}>
          {items.map((item: OrderItem, index: number) => ( // FIX: item 및 index에 타입 명시
            <OrderItemDisplay key={item.id || index} item={item} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333' }}>총 {totalPrice.toLocaleString()}원</span>
      </div>
    </div>
  );
};

const PickupProcessingPage: React.FC = () => {
  const [phoneNumberLast4, setPhoneNumberLast4] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Order[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumberLast4.length < 2 || phoneNumberLast4.length > 4) {
      setMessage('전화번호 뒷 2~4자리를 입력해주세요.');
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setSelectedOrderIds([]);

    try {
      const results = await searchOrdersByPhoneNumber(phoneNumberLast4);
      if (results.length === 0) {
        setMessage('검색 결과가 없습니다.');
      }
      setSearchResults(results);
    } catch (error) {
      console.error("주문 검색 중 오류 발생:", error);
      setMessage('주문 검색 중 오류가 발생했습니다. 다시 시도해주세요.');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderIds(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleStatusUpdate = async (status: 'delivered' | 'cancelled' | 'paid') => {
    if (selectedOrderIds.length === 0) {
      alert('처리할 주문을 선택해주세요.');
      return;
    }

    const confirmMessage =
      status === 'delivered' ? '선택한 주문을 픽업 완료 처리하시겠습니까?' :
      status === 'cancelled' ? '선택한 주문을 노쇼 처리하시겠습니까?' :
      '선택한 주문을 선입금 처리하시겠습니까?';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsLoading(true);
    setMessage(null);
    try {
      await updateOrderStatus(selectedOrderIds, status);
      setMessage(`${selectedOrderIds.length}개 주문이 ${status === 'delivered' ? '픽업 완료' : status === 'cancelled' ? '노쇼 처리' : '선입금'} 처리되었습니다.`);
      const results = await searchOrdersByPhoneNumber(phoneNumberLast4);
      setSearchResults(results);
      setSelectedOrderIds([]);
    } catch (error) {
      console.error("주문 상태 업데이트 중 오류 발생:", error);
      setMessage('주문 상태 업데이트 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const totalPrice = searchResults
    .filter((order: Order) => selectedOrderIds.includes(order.id)) // FIX: order에 타입 명시
    .reduce((sum: number, order: Order) => sum + order.totalPrice, 0); // FIX: sum 및 order에 타입 명시

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '20px' }}>
        빠른 픽업 처리
      </h1>
      <form onSubmit={handleSearch} style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flexGrow: 1, maxWidth: '300px' }}>
          <Phone size={20} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
          <input
            type="tel"
            value={phoneNumberLast4}
            onChange={(e) => setPhoneNumberLast4(e.target.value)}
            placeholder="전화번호 뒷 4자리"
            pattern="[0-9]*"
            maxLength={4}
            style={{
              width: '100%',
              padding: '10px 10px 10px 40px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontSize: '1rem',
            }}
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
          disabled={isLoading}
        >
          {isLoading ? <Loader size={20} className="spin" /> : <Search size={20} />}
          <span>조회</span>
        </button>
      </form>

      {message && <p style={{ textAlign: 'center', color: message.includes('오류') ? 'red' : '#6b7280', margin: '15px 0' }}>{message}</p>}

      {isLoading && searchResults.length === 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
          <Loader size={30} className="spin" />
        </div>
      )}

      {searchResults.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', justifyContent: 'center', paddingBottom: '100px' }}>
            {searchResults.map((order: Order) => ( // FIX: order에 타입 명시
              <OrderCard
                key={order.id}
                order={order}
                onSelect={handleSelectOrder}
                isSelected={selectedOrderIds.includes(order.id)}
              />
            ))}
          </div>

          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              width: '100%',
              backgroundColor: 'white',
              padding: '10px 20px',
              boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxSizing: 'border-box',
              gap: '10px',
              zIndex: 1000,
            }}
          >
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#333', flexShrink: 0 }}>
              총 {totalPrice.toLocaleString()}원
            </span>
            <div style={{ display: 'flex', flexGrow: 1, gap: '5px' }}>
              <button
                onClick={() => handleStatusUpdate('paid')}
                style={{ backgroundColor: '#ffc107', color: 'white', height: '50px', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', flexGrow: 1, cursor: 'pointer', border: 'none' }}
                disabled={selectedOrderIds.length === 0 || isLoading}
              >
                <DollarSign size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                선입금
              </button>
              <button
                onClick={() => handleStatusUpdate('cancelled')}
                style={{ backgroundColor: '#dc3545', color: 'white', height: '50px', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', flexGrow: 1, cursor: 'pointer', border: 'none' }}
                disabled={selectedOrderIds.length === 0 || isLoading}
              >
                <XCircle size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                노쇼 처리
              </button>
              <button
                onClick={() => handleStatusUpdate('delivered')}
                style={{ backgroundColor: '#007bff', color: 'white', height: '50px', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', flexGrow: 1, cursor: 'pointer', border: 'none' }}
                disabled={selectedOrderIds.length === 0 || isLoading}
              >
                <CheckCircle size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                픽업 완료
              </button>
            </div>
          </div>
        </>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default PickupProcessingPage;
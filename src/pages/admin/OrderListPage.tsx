// src/pages/admin/OrderListPage.tsx

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, orderBy, Timestamp, updateDoc, doc, onSnapshot, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { Loader } from 'lucide-react';
import './OrderListPage.css';

/**
앙 기모찌
 */

type OrderStatus = '예약' | '선입금' | '완료' | '취소';
interface Order {
  id: string;
  userId?: string;
  customerName: string;
  productName: string;
  totalPrice: number;
  status: OrderStatus;
  orderDate: Timestamp;
}

/**
 * 공통 로딩 스피너 컴포넌트.
 * 다른 관리자 페이지에서도 재사용될 수 있습니다. 앙 기모찌
 */
const LoadingSpinner = () => (
    <div className="loading-overlay">
        <Loader size={48} className="spin" />
        <p>데이터를 불러오는 중...</p>
    </div>
);

const OrderListPage = () => {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  // Firestore에서 주문 데이터를 실시간으로 가져옵니다.
  useEffect(() => {
    setIsLoading(true);
    // 'orderDate'를 기준으로 최신순으로 정렬
    const ordersQuery = query(collection(db, 'orders'), orderBy('orderDate', 'desc'));
    
    // onSnapshot을 사용하여 실시간 업데이트를 구독합니다.
    const unsubscribe = onSnapshot(ordersQuery, (querySnapshot) => {
      const ordersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setAllOrders(ordersData);
      setIsLoading(false);
    }, (error) => {
      console.error("주문 목록 실시간 로딩 오류:", error);
      setIsLoading(false);
      // 사용자에게 에러 메시지를 표시하는 상태를 추가할 수 있습니다.
    });

    // 컴포넌트 언마운트 시 구독을 해제합니다.
    return () => unsubscribe();
  }, []);

  /**
   * 검색어와 필터에 따라 주문 목록을 필터링합니다.
   * useMemo를 사용하여 검색/필터 조건이 변경될 때만 재계산하도록 최적화했습니다.
   */
  const filteredOrders = useMemo(() => {
    let results = allOrders;
    // 상태 필터링
    if (statusFilter !== 'all') {
      results = results.filter(order => order.status === statusFilter);
    }
    // 검색어 필터링 (주문자 이름 기준)
    if (searchTerm) {
      results = results.filter(order =>
        (order.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return results;
  }, [searchTerm, statusFilter, allOrders]);

  /**
   * 주문 상태를 업데이트하고, '취소' 시 노쇼 카운트를 증가시킵니다.
   * useCallback을 사용하여 의존성 변경 시에만 함수가 재생성되도록 최적화했습니다.
   */
  const handleStatusChange = useCallback(async (order: Order, newStatus: OrderStatus) => {
    const orderRef = doc(db, 'orders', order.id);

    try {
      await updateDoc(orderRef, { status: newStatus });

      // 상태가 '취소'로 변경되고, userId가 있는 경우에만 노쇼 카운트를 올립니다.
      if (newStatus === '취소' && order.userId) {
        const userRef = doc(db, 'users', order.userId);
        await updateDoc(userRef, {
            noShowCount: increment(1)
        });
        alert(`주문 상태가 '취소'로 변경되었으며, 고객의 노쇼 횟수가 1 증가했습니다.`);
      }
    } catch (error) {
      alert('상태 업데이트에 실패했습니다. 다시 시도해주세요.');
      console.error("상태 업데이트 오류: ", error);
    }
  }, []);
  
  /**
   * 주문 상태에 따른 CSS 클래스를 반환하는 함수.
   * 인라인 스타일 대신 CSS 파일에서 상태별 스타일을 관리할 수 있도록 개선합니다.
   */
  const getStatusClass = (status: OrderStatus) => {
    return `status-${status}`;
  };

  // 데이터 로딩 중일 때 로딩 스피너 표시
  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="order-list-container">
      <h1 className="order-list-header">전체 주문 관리</h1>
      
      <div className="order-controls">
        <input
          type="text"
          placeholder="주문자 이름으로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <div className="status-filter-buttons">
          {(['all', '예약', '선입금', '완료', '취소'] as const).map(status => (
            <button 
              key={status} 
              onClick={() => setStatusFilter(status)}
              className={`status-filter-btn ${statusFilter === status ? 'active' : ''}`}
            >
              {status === 'all' ? '전체' : status}
            </button>
          ))}
        </div>
      </div>
      
      <div className="order-table-wrapper">
        {filteredOrders.length > 0 ? (
            <table className="order-table">
                <thead>
                    <tr>
                      <th>주문일자</th>
                      <th>주문자</th>
                      <th>상품명</th>
                      <th>주문금액</th>
                      <th>현재 상태</th>
                      <th className="status-change-col">상태 변경</th>
                    </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => (
                    <tr key={order.id}>
                      <td>{order.orderDate.toDate().toLocaleDateString('ko-KR')}</td>
                      <td>{order.customerName}</td>
                      <td>{order.productName}</td>
                      <td>{order.totalPrice.toLocaleString()}원</td>
                      <td><span className={`status-badge ${getStatusClass(order.status)}`}>{order.status}</span></td>
                      <td>
                        <select 
                          value={order.status} 
                          onChange={(e) => handleStatusChange(order, e.target.value as OrderStatus)} 
                          className="status-select"
                        >
                          <option value="예약">예약</option>
                          <option value="선입금">선입금</option>
                          <option value="완료">완료</option>
                          <option value="취소">취소</option> 
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
            </table>
        ) : (
            <p className="no-data-message">표시할 주문이 없습니다.</p>
        )}
      </div>
    </div>
  );
};

export default OrderListPage;
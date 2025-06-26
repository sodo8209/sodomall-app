// src/pages/admin/UserDetailPage.tsx

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, orderBy, doc, Timestamp, onSnapshot, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Loader } from 'lucide-react';
import './UserDetailPage.css';

interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  noShowCount?: number;
  isRestricted?: boolean;
}
interface Order {
  id: string;
  orderDate: Timestamp;
  productName: string;
  totalPrice: number;
}

// 공통 로딩 스피너 컴포넌트
const LoadingSpinner = () => (
    <div className="loading-overlay">
        <Loader size={48} className="spin" />
        <p>데이터를 불러오는 중...</p>
    </div>
);

const UserDetailPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<AppUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);

    // 사용자 정보를 실시간으로 감지
    const userRef = doc(db, 'users', userId);
    const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setUser({ uid: docSnap.id, ...docSnap.data() } as AppUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    }, (error) => {
        console.error("사용자 정보 실시간 로딩 오류:", error);
        setIsLoading(false);
        setUser(null);
    });

    // 주문 내역은 최초 1회 로딩
    const fetchOrders = async () => {
      try {
        const ordersQuery = query(collection(db, 'orders'), where('userId', '==', userId), orderBy('orderDate', 'desc'));
        const querySnapshot = await getDocs(ordersQuery);
        const ordersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        setOrders(ordersData);
      } catch (error) {
        console.error("주문 내역 불러오기 실패:", error);
        setOrders([]);
      }
    };
    
    fetchOrders();

    return () => unsubscribeUser();
  }, [userId]);

  // 이용 제한 상태를 토글하는 함수
  const handleToggleRestriction = async () => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    try {
        await updateDoc(userRef, {
            isRestricted: !user.isRestricted
        });
        alert(`사용자 ${user.displayName}님의 이용 제한 상태가 변경되었습니다.`);
    } catch (error) {
        console.error("이용 제한 상태 변경 실패:", error);
        alert("상태 변경에 실패했습니다. 다시 시도해주세요.");
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return (
        <div className="user-detail-container">
            <Link to="/admin/users" className="back-link">&larr; 모든 고객 목록으로 돌아가기</Link>
            <p className="no-data-message">해당 고객을 찾을 수 없습니다.</p>
        </div>
    );
  }

  return (
    <div className="user-detail-container">
      <Link to="/admin/users" className="back-link">&larr; 모든 고객 목록으로 돌아가기</Link>
      
      <div className="user-info-card">
        <div className="user-details">
            <h2 className="user-name">{user.displayName}</h2>
            <p className="user-email">{user.email}</p>
            <p className="no-show-count">노쇼 횟수: {user.noShowCount || 0}회</p>
        </div>
        <div>
            <button 
                onClick={handleToggleRestriction}
                className={`restriction-button ${user.isRestricted ? 'unrestrict-btn' : 'restrict-btn'}`}
            >
                {user.isRestricted ? '✅ 이용 제한 풀기' : '🚫 이용 제한하기'}
            </button>
        </div>
      </div>
      
      <h3 className="order-history-title">주문 내역 ({orders.length}건)</h3>
      <div className="order-history-table-wrapper">
        {orders.length > 0 ? (
            <table className="order-history-table">
                <thead>
                    <tr>
                      <th>주문일자</th>
                      <th>주문 상품</th>
                      <th className="text-right">결제 금액</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map(order => (
                      <tr key={order.id}>
                        <td>{order.orderDate.toDate().toLocaleDateString('ko-KR')}</td>
                        <td>{order.productName}</td>
                        <td className="text-right">{order.totalPrice.toLocaleString()}원</td>
                      </tr>
                    ))}
                </tbody>
            </table>
        ) : (
            <p className="no-data-message">주문 내역이 없습니다.</p>
        )}
      </div>
    </div>
  );
};

export default UserDetailPage;
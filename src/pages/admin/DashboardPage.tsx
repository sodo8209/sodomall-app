// src/pages/admin/DashboardPage.tsx

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, getCountFromServer } from 'firebase/firestore';
import type { Order } from '../../types';
import { db } from '../../firebase';
import { Users, ShoppingCart, DollarSign, Loader, Check, X, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './DashboardPage.css';
import DailyDashboardModal from '../../components/admin/DailyDashboardModal';

/**
 * 공통 로딩 스피너 컴포넌트.
 * 이 컴포넌트는 다른 페이지에서도 재활용됩니다.
 */
const LoadingSpinner = () => (
    <div className="loading-overlay">
        <Loader size={48} className="spin" />
        <p>데이터를 불러오는 중...</p>
    </div>
);

/**
 * 공통 메시지 배너 컴포넌트.
 * 이 컴포넌트는 다른 페이지에서도 재활용됩니다.
 */
const MessageBanner = ({ message, type }: { message: string | null, type: 'error' | 'success' | 'info' }) => {
    if (!message) return null;
    return (
        <div className={`message-banner ${type}-message-banner`}>
            {type === 'error' && <X size={16} className="icon"/>}
            {type === 'success' && <Check size={16} className="icon"/>}
            {type === 'info' && <Info size={16} className="icon"/>}
            <span>{message}</span>
        </div>
    );
};

// StatCard, RecentOrdersTable 컴포넌트는 그대로 유지
const StatCard = ({ icon, title, value, color }: { icon: React.ReactNode; title: string; value: string | number; color: string }) => (
    <div className="stat-card" style={{ '--card-color': color } as React.CSSProperties}>
        <div className="stat-icon">{icon}</div>
        <div className="stat-info">
            <span className="stat-title">{title}</span>
            <span className="stat-value">{value}</span>
        </div>
    </div>
);
const RecentOrdersTable = ({ orders }: { orders: Order[] }) => (
    <div className="dashboard-table-container">
        <h3 className="dashboard-section-title">최근 주문 (5건)</h3>
        <table>
            <thead><tr><th>주문일</th><th>주문자</th><th>주문 금액</th><th>상태</th></tr></thead>
            <tbody>
                {orders.map(order => (
                    <tr key={order.id}>
                        <td>{order.orderDate.toDate().toLocaleDateString('ko-KR')}</td>
                        <td>{order.customerName}</td>
                        <td>{order.totalPrice.toLocaleString()}원</td>
                        <td><span className={`status-badge status-${order.status}`}>{order.status}</span></td>
                    </tr>
                ))}
            </tbody>
        </table>
        {orders.length === 0 && <p className="no-data">최근 주문 내역이 없습니다.</p>}
    </div>
);

const DashboardPage: React.FC = () => {
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // [개선] 에러 메시지 상태 추가
  
  // 실제 데이터 대신 임시 차트 데이터를 사용
  const chartData = [
    { name: '월', 매출: 400000 }, { name: '화', 매출: 300000 }, { name: '수', 매출: 200000 },
    { name: '목', 매출: 278000 }, { name: '금', 매출: 189000 }, { name: '토', 매출: 239000 }, { name: '일', 매출: 349000 },
  ];

  // 일일 대시보드 모달 표시 로직
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const hideDate = localStorage.getItem('hideDailyDashboard');
    if (hideDate !== today) {
      setShowDailyModal(true);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setErrorMessage(null); // 새로운 데이터 로딩 시 에러 메시지 초기화
      try {
        // 총 사용자 수 가져오기 (getCountFromServer 사용)
        const usersColl = collection(db, "users");
        const usersSnapshot = await getCountFromServer(usersColl);
        setTotalUsers(usersSnapshot.data().count);
      } catch (err) {
        console.error("Failed to fetch user count:", err);
        setErrorMessage("사용자 수를 불러오는데 실패했습니다. 네트워크 연결을 확인해주세요."); // 에러 메시지 설정
      } finally {
        setIsLoading(false);
      }
    };

    // 최근 주문 목록 실시간으로 가져오기 (onSnapshot 사용)
    const ordersQuery = query(collection(db, 'orders'), orderBy('orderDate', 'desc'), limit(5));
    const unsubscribe = onSnapshot(ordersQuery, snapshot => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setRecentOrders(orders);
    }, (error) => {
        console.error("Failed to fetch recent orders:", error);
        setErrorMessage("최근 주문 내역을 불러오는데 실패했습니다."); // 에러 메시지 설정
    });

    fetchData();
    // 이 부분은 실제 데이터로 대체되어야 합니다.
    setTotalOrders(125); 
    setTotalRevenue(12345678);

    // 컴포넌트 언마운트 시 구독 해제
    return () => unsubscribe();
  }, []);

  return (
    <div className="dashboard-container">
      {isLoading && <LoadingSpinner />}
      <DailyDashboardModal isOpen={showDailyModal} onClose={() => setShowDailyModal(false)} />
      
      <header className="dashboard-header">
        <h1>메인 대시보드</h1>
        <p>{new Date().toLocaleDateString('ko-KR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </header>
      
      {/* [개선] MessageBanner 컴포넌트를 활용하여 에러 메시지를 표시합니다. */}
      <MessageBanner message={errorMessage} type="error" />

      <div className="stats-grid">
        <StatCard icon={<Users size={24} />} title="총 회원 수" value={totalUsers.toLocaleString()} color="#3b82f6" />
        <StatCard icon={<ShoppingCart size={24} />} title="누적 주문 수" value={totalOrders.toLocaleString()} color="#8b5cf6" />
        <StatCard icon={<DollarSign size={24} />} title="누적 매출액" value={`${totalRevenue.toLocaleString()} 원`} color="#10b981" />
      </div>

      <div className="dashboard-main-grid">
        <div className="dashboard-chart-container">
            <h3 className="dashboard-section-title">주간 매출 현황</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(value: number) => `${value / 1000}k`} tickLine={false} axisLine={false}/>
                    <Tooltip cursor={{fill: 'rgba(239, 246, 255, 0.5)'}} formatter={(value: number) => `${value.toLocaleString()}원`} />
                    <Legend />
                    <Bar dataKey="매출" fill="#8884d8" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
        <RecentOrdersTable orders={recentOrders} />
      </div>
    </div>
  );
};

export default DashboardPage;
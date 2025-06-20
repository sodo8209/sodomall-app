// src/OrderHistoryPage.tsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";
import './App.css';

// 주문 데이터의 타입을 정의합니다.
interface Order {
  id: string;
  date: string;
  total: number;
  items: { title: string, quantity: number }[];
}

interface OrderHistoryPageProps {
  user: User;
}

const OrderHistoryPage = ({ user }: OrderHistoryPageProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;

      setLoading(true);
      // 'orders' 컬렉션에서 'userId'가 현재 로그인한 사용자의 uid와 같은 문서만 쿼리합니다.
      const ordersQuery = query(collection(db, "orders"), where("userId", "==", user.uid));
      const orderSnapshot = await getDocs(ordersQuery);

      const ordersList = orderSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Order));

      setOrders(ordersList);
      setLoading(false);
    };

    fetchOrders();
  }, [user]); // user 객체가 변경될 때마다 실행

  return (
    <div className="product-list-container">
      <h1>주문 내역</h1>
      <Link to="/">상품 목록으로 돌아가기</Link>
      <hr />

      {loading ? (
        <p>주문 내역을 불러오는 중...</p>
      ) : orders.length === 0 ? (
        <p>주문 내역이 없습니다.</p>
      ) : (
        <div>
          {orders.map(order => (
            <div key={order.id} className="product-card">
              <div className="product-details">
                <h2 className="product-title">주문일: {new Date(order.date).toLocaleDateString('ko-KR')}</h2>
                <ul>
                  {order.items.map(item => (
                    <li key={item.title}>{item.title} (수량: {item.quantity})</li>
                  ))}
                </ul>
                <p className="product-price">총 결제 금액: {order.total.toLocaleString()}원</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderHistoryPage;
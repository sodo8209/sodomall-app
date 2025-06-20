// src/App.tsx

import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore"; // addDoc을 추가로 불러옵니다.
import { auth, db } from "./firebase";
import LoginPage from "./LoginPage";
import ProductListPage from "./ProductListPage";
import CartPage from "./CartPage";
import OrderHistoryPage from "./OrderHistoryPage"; // 방금 만든 주문 내역 페이지를 불러옵니다.
import './App.css';
import AdminPage from "./AdminPage"; // 관리자 페이지 불러오기

interface Product {
  id: string;
  title: string;
  price: number;
}
interface CartItem extends Product {
  quantity: number;
}

// 주문하기 버튼이 있는 컴포넌트에서 navigate 함수를 사용하기 위한 래퍼 컴포넌트
function AppWrapper() {
  const navigate = useNavigate();

  return <App navigate={navigate} />;
}

// App 컴포넌트가 navigate 함수를 props로 받도록 수정
function App({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);

  const handleAddToCart = (productToAdd: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === productToAdd.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === productToAdd.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...productToAdd, quantity: 1 }];
    });
    alert(`${productToAdd.title} 상품을 장바구니에 담았습니다!`);
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    setCart(prevCart => {
      if (newQuantity < 1) {
        return prevCart.filter(item => item.id !== productId);
      }
      return prevCart.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      );
    });
  };

  const handleRemoveItem = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  // --- 주문 처리 기능 추가 ---
  const handleOrder = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (cart.length === 0) {
      alert("장바구니가 비어 있습니다.");
      return;
    }

    try {
      // 주문 객체 생성
      const orderData = {
        userId: user.uid, // 주문한 사용자 ID
        date: new Date().toISOString(), // 주문 시각
        items: cart.map(item => ({ title: item.title, quantity: item.quantity, price: item.price })),
        total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        pickupStatus: 'ordered', // 주문 상태
        paymentStatus: 'pending' // 결제 상태
      };

      // 'orders' 컬렉션에 주문 데이터 추가
      await addDoc(collection(db, "orders"), orderData);
      
      alert("주문이 완료되었습니다!");
      setCart([]); // 장바구니 비우기
      navigate('/orders'); // 주문 내역 페이지로 이동
    } catch (error) {
      console.error("주문 처리 중 오류 발생: ", error);
      alert("주문 처리 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div>로딩 중...</div>;
  }
  
  return (
    <>
      {user && (
        <nav style={{ padding: '1rem', backgroundColor: '#eee', textAlign: 'center' }}>
          <Link to="/" style={{ marginRight: '1rem' }}>상품 목록</Link>
          <Link to="/cart" style={{ marginRight: '1rem' }}>장바구니 ({cart.reduce((sum, item) => sum + item.quantity, 0)})</Link>
          <Link to="/orders">주문 내역</Link> {/* 주문 내역 링크 추가 */}
        </nav>
      )}
      
      <Routes>
        {user ? (
          <>
            <Route path="/" element={<ProductListPage user={user} handleAddToCart={handleAddToCart} />} />
            <Route 
              path="/cart" 
              element={<CartPage 
                cart={cart} 
                onUpdateQuantity={handleUpdateQuantity} 
                onRemoveItem={handleRemoveItem} 
                onOrder={handleOrder} // 주문하기 함수 전달
              />} 
            />
            <Route path="/orders" element={<OrderHistoryPage user={user} />} /> {/* 주문 내역 페이지 라우트 추가 */}
            <Route path="/admin" element={<AdminPage />} /> {/* 이 줄을 추가합니다 */}
          </>
        ) : (
          <Route path="*" element={<LoginPage />} />
        )}
      </Routes>
    </>
  );
}

// BrowserRouter를 최상위에서 한 번만 사용하도록 AppWrapper를 만듭니다.
function AppContainer() {
  return (
    <BrowserRouter>
      <AppWrapper />
    </BrowserRouter>
  );
}

export default AppContainer;
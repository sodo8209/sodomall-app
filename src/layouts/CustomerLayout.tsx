// src/layouts/CustomerLayout.tsx

import React, { Suspense } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

// 로딩 스피너
const LoadingSpinner = () => <div className="loading-spinner">로딩 중...</div>;

// 고객용 페이지 컴포넌트들 (Lazy Loading)
const ProductListPage = React.lazy(() => import('../pages/customer/ProductListPage'));
const ProductDetailPage = React.lazy(() => import('../pages/customer/ProductDetailPage'));
const MyPage = React.lazy(() => import('../pages/customer/MyPage'));
const CartPage = React.lazy(() => import('../pages/customer/CartPage'));
const BoardPage = React.lazy(() => import('../pages/customer/BoardPage'));
// [추가] MyPage 하위 메뉴들을 위한 컴포넌트들을 Lazy Loading으로 추가
const OrderHistoryPage = React.lazy(() => import('../pages/customer/OrderHistoryPage'));
const OrderCalendar = React.lazy(() => import('../components/customer/OrderCalendar'));
const ProductArrivalCalendar = React.lazy(() => import('../components/customer/ProductArrivalCalendar'));
const StoreInfoPage = React.lazy(() => import('../pages/customer/StoreInfoPage'));

// FIX: ProductDetailPage를 페이지로 렌더링하기 위한 Wrapper 컴포넌트
// 이 컴포넌트가 URL의 productId를 ProductDetailPage의 props로 변환해줍니다.
const ProductDetailPageWrapper = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  // productId가 없으면 상품 목록으로 돌려보냅니다.
  if (!productId) {
    navigate('/');
    return null;
  }
  
  // 페이지로 열 때는 항상 열려있고(isOpen={true}), 닫기 버튼을 누르면 목록으로 이동합니다.
  return (
    <ProductDetailPage
      productId={productId}
      isOpen={true}
      onClose={() => navigate('/')}
    />
  );
};

const CustomerLayout = () => {
  return (
    <div className="app-layout">
      <main className="main-content">
        <Suspense fallback={<LoadingSpinner />}>
            <Routes>
                {/* 메인 페이지 */}
                <Route index element={<ProductListPage />} />
                
                {/* 상품 상세 페이지 */}
                <Route path="products/:productId" element={<ProductDetailPageWrapper />} />
                
                {/* 장바구니 페이지 */}
                <Route path="cart" element={<CartPage />} />
                
                {/* 게시판 페이지 */}
                <Route path="board" element={<BoardPage />} />
                
                {/* 마이페이지 및 하위 라우트들 */}
                <Route path="mypage" element={<MyPage />} />
                <Route path="mypage/history" element={<OrderHistoryPage />} />
                <Route path="mypage/orders" element={<OrderCalendar />} />
                <Route path="mypage/arrivals" element={<ProductArrivalCalendar />} />
                <Route path="mypage/store-info" element={<StoreInfoPage />} />
            </Routes>
        </Suspense>
      </main>
      <BottomNav />
    </div>
  );
};

export default CustomerLayout;
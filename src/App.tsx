// src/App.tsx

import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import './index.css';
import './App.css';

import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

const LoadingSpinner = () => <div className="loading-spinner">로딩 중...</div>;

// --- FIX: 아래 import 경로의 파일 이름(대소문자)을 실제 파일과 정확히 일치시켜주세요 ---
// 1. 실제 파일 이름이 'CustomerLayout.tsx'가 맞는지 확인합니다.
// 2. 만약 'customerlayout.tsx' 나 'Customerlayout.tsx' 등 다르다면 아래 코드도 똑같이 변경해야 합니다.
const CustomerLayout = React.lazy(() => import('./layouts/CustomerLayout'));
const AdminPage = React.lazy(() => import('./pages/admin/AdminPage'));

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/admin/*" element={<AdminPage />} />
              <Route path="/*" element={<CustomerLayout />} />
            </Routes>
          </Suspense>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
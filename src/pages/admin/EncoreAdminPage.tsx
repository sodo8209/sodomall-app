// src/pages/admin/EncoreAdminPage.tsx

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';

interface Product {
  id: string;
  name: string;
  requestCount?: number;
  stock?: number;
}

const EncoreAdminPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // requestCount가 있는 문서를 내림차순으로 정렬하여 쿼리합니다.
    const q = query(collection(db, 'products'), orderBy('requestCount', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Product))
        // 요청이 1 이상인 상품만 화면에 표시합니다.
        .filter(p => (p.requestCount || 0) > 0);
      setProducts(productList);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoading) return <div>로딩 중...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>앵콜 공구 요청 현황</h1>
      <div style={{ backgroundColor: 'white', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)', borderRadius: '0.5rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>순위</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>상품명</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>요청 수</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>현재 재고</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => (
              <tr key={product.id}>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>{index + 1}</td>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>{product.name}</td>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontWeight: 'bold' }}>{product.requestCount || 0}</td>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>{product.stock === undefined ? 'N/A' : product.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && !isLoading && <p style={{ textAlign: 'center', padding: '20px' }}>아직 앵콜 요청이 없습니다.</p>}
      </div>
    </div>
  );
};

export default EncoreAdminPage;
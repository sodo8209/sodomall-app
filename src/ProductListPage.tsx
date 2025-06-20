// src/ProductListPage.tsx

import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
// 이렇게 두 줄로 수정해주세요!
import { collection, getDocs } from "firebase/firestore";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import type { User } from "firebase/auth";
import { auth, db } from "./firebase";
import './App.css';

interface Product {
  id: string;
  title: string;
  price: number;
}

interface ProductListPageProps {
  user: User;
  handleAddToCart: (product: Product) => void;
}

const ProductListPage = ({ user, handleAddToCart }: ProductListPageProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = () => {
    signOut(auth);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const productsCollection = collection(db, "products");
      const productSnapshot = await getDocs(productsCollection);
      const productList = productSnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
        id: doc.id,
        ...doc.data(),
      } as Product));
      setProducts(productList);
      setLoading(false);
    };
    fetchProducts();
  }, []);

  return (
    <div className="product-list-container">
      <button onClick={handleLogout} className="logout-btn">로그아웃</button>
      <h1>소도몰 상품 목록</h1>
      <p>환영합니다, {user.displayName}님!</p>
      <hr />
      
      {loading ? (
        <p>상품 목록을 불러오는 중...</p>
      ) : (
        <div>
          {products.map(product => (
            <div key={product.id} className="product-card">
              <img src={`https://placehold.co/100x100?text=${product.title}`} alt={product.title} className="product-image" />
              <div className="product-details">
                <h2 className="product-title">{product.title}</h2>
                <p className="product-price">{product.price.toLocaleString()}원</p>
                <div className="product-controls">
                  <button className="add-to-cart-btn" onClick={() => handleAddToCart(product)}>
                    장바구니 담기
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductListPage;
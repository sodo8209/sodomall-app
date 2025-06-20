// src/CartPage.tsx

import { Link } from "react-router-dom";
import './App.css';

interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
}

interface CartPageProps {
  cart: CartItem[];
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onOrder: () => void; // 주문 함수 타입을 추가합니다.
}

const CartPage = ({ cart = [], onUpdateQuantity, onRemoveItem, onOrder }: CartPageProps) => {
  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="product-list-container">
      <h1>장바구니</h1>
      <Link to="/">상품 목록으로 돌아가기</Link>
      <hr />

      {cart.length === 0 ? (
        <p>장바구니가 비어 있습니다.</p>
      ) : (
        <div>
          {cart.map(item => (
            <div key={item.id} className="product-card">
              <img src={`https://placehold.co/100x100?text=${item.title}`} alt={item.title} className="product-image" />
              <div className="product-details">
                <h2 className="product-title">{item.title}</h2>
                <p className="product-price">{item.price.toLocaleString()}원</p>
                <p>합계: {(item.price * item.quantity).toLocaleString()}원</p>
              </div>
              <div className="cart-item-controls">
                <div className="cart-quantity-controls">
                  <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>+</button>
                </div>
                <button className="remove-from-cart-btn" onClick={() => onRemoveItem(item.id)}>삭제</button>
              </div>
            </div>
          ))}
          <hr />
          <h2>총 주문 금액: {totalAmount.toLocaleString()}원</h2>
          {/* 주문하기 버튼에 onOrder 함수를 연결합니다. */}
          <button className="add-to-cart-btn" onClick={onOrder}>주문하기</button>
        </div>
      )}
    </div>
  );
};

export default CartPage;
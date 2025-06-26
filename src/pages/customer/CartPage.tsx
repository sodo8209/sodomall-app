import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import type { CartItem, OrderItem } from '../../types';
import { createOrder } from '../../firebase'; // FIX: import 경로 수정
import { Timestamp } from 'firebase/firestore';

import './CartPage.css';
import { Trash2, Minus, Plus, ShoppingCart as CartIcon } from 'lucide-react';

const CartPage: React.FC = () => {
  const { user } = useAuth();
  const { cartItems, removeFromCart, updateCartItemQuantity, clearCart, cartTotal } = useCart();
  const navigate = useNavigate();
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

  useEffect(() => {
    if (!user) {
      alert('로그인하시면 장바구니를 확인하고 예약할 수 있습니다.');
      navigate('/login');
    }
  }, [user, navigate]);

  const handleQuantityChange = (item: CartItem, amount: number) => {
    const newQuantity = item.quantity + amount;

    if (newQuantity < 1) return;

    if (item.salesType === 'IN_STOCK' && item.availableStock !== -1 && newQuantity > item.availableStock) {
      alert(`선택하신 상품의 재고는 ${item.availableStock}개 입니다.`);
      return;
    }

    if (item.maxOrderPerPerson && newQuantity > item.maxOrderPerPerson) {
      alert(`1인당 최대 구매 수량은 ${item.maxOrderPerPerson}개 입니다.`);
      return;
    }

    updateCartItemQuantity(item.productId, item.selectedUnit, newQuantity);
  };

  const handleRemoveItem = (item: CartItem) => {
    if (window.confirm(`"${item.productName}" (${item.selectedUnit})을(를) 장바구니에서 삭제하시겠습니까?`)) {
      removeFromCart(item.productId, item.selectedUnit);
    }
  };

  const handleConfirmReservation = async () => {
    if (!user) {
      alert('로그인 정보가 유효하지 않습니다. 다시 로그인해주세요.');
      navigate('/login');
      return;
    }
    if (cartItems.length === 0) {
      alert('장바구니에 담긴 상품이 없습니다.');
      return;
    }
    if (isProcessingOrder) {
      return;
    }

    if (!window.confirm(`총 ${cartTotal.toLocaleString()}원의 예약을 확정하시겠습니까?`)) {
      return;
    }

    setIsProcessingOrder(true);
    try {
      const orderItems: OrderItem[] = cartItems.map((item: CartItem) => ({ // FIX: item에 타입 명시
        id: item.productId,
        name: item.productName,
        quantity: item.quantity,
        price: item.unitPrice,
        unit: item.selectedUnit,
        // 필요하다면 category, subCategory 등 추가 정보도 여기에 포함
      }));

      const defaultPickupDate = new Date();
      defaultPickupDate.setDate(defaultPickupDate.getDate() + 1);

      const defaultPickupDeadlineDate = new Date(defaultPickupDate);
      defaultPickupDeadlineDate.setHours(23, 59, 59, 999);

      const customerName = user.displayName || '미상';
      const customerPhoneLast4 = '0000'; // 임시 값

      const newOrderData = {
        userId: user.uid,
        customerName: customerName,
        customerPhoneLast4: customerPhoneLast4,
        items: orderItems,
        totalPrice: cartTotal,
        orderDate: Timestamp.now(),
        pickupDate: Timestamp.fromDate(defaultPickupDate),
        pickupDeadlineDate: Timestamp.fromDate(defaultPickupDeadlineDate),
        status: 'pending' as const,
      };

      await createOrder(newOrderData);
      clearCart();

      alert('예약이 성공적으로 확정되었습니다!');
      navigate('/mypage/history');
    } catch (error) {
      console.error("예약 확정 중 오류 발생:", error);
      alert('예약 확정 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsProcessingOrder(false);
    }
  };

  if (!user) {
    return <div className="customer-page-container">로그인 정보 확인 중...</div>;
  }

  return (
    <>
      <Header title="장바구니" />
      <div className="customer-page-container cart-page-container">
        <h2 className="cart-page-title">내 장바구니</h2>

        {cartItems.length === 0 ? (
          <div className="empty-cart-message">
            <CartIcon size={48} className="empty-cart-icon" />
            <p>장바구니에 담긴 상품이 없습니다.</p>
            <Link to="/" className="continue-shopping-btn">쇼핑 계속하기</Link>
          </div>
        ) : (
          <div className="cart-items-list">
            {cartItems.map((item: CartItem) => ( // FIX: item에 타입 명시
              <div key={`${item.productId}-${item.selectedUnit}`} className="cart-item-card">
                <div className="item-image-wrapper">
                  <img src={item.imageUrl} alt={item.productName} className="item-image" />
                </div>
                <div className="item-details">
                  <h3 className="item-name">
                    <Link to={`/products/${item.productId}`}>{item.productName}</Link>
                  </h3>
                  <p className="item-unit">{item.selectedUnit}</p>
                  <p className="item-price">{item.unitPrice.toLocaleString()}원</p>
                  <div className="item-quantity-controls">
                    <button onClick={() => handleQuantityChange(item, -1)} disabled={item.quantity <= 1 || isProcessingOrder}><Minus size={16} /></button>
                    <span>{item.quantity}</span>
                    <button onClick={() => handleQuantityChange(item, 1)} disabled={isProcessingOrder}><Plus size={16} /></button>
                  </div>
                </div>
                <button className="item-remove-btn" onClick={() => handleRemoveItem(item)} disabled={isProcessingOrder}>
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        )}

        {cartItems.length > 0 && (
          <div className="cart-summary-card">
            <div className="summary-row">
              <span>총 상품 금액</span>
              <span className="summary-price">{cartTotal.toLocaleString()}원</span>
            </div>
            <div className="summary-row total-amount">
              <span>총 예약 금액</span>
              <span className="summary-price total-price">{cartTotal.toLocaleString()}원</span>
            </div>
            <button className="checkout-btn" onClick={handleConfirmReservation} disabled={isProcessingOrder}>
              {isProcessingOrder ? '예약 처리 중...' : `${cartTotal.toLocaleString()}원 예약 확정하기`}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartPage;
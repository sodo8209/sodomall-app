import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product, PricingOption, CartItem } from '../../types';
import { getProductById } from '../../firebase';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

import {
  ShoppingCart,
  ChevronLeft, ChevronRight, X, Clock, Calendar
} from 'lucide-react';
import './ProductDetailPage.css';

const formatPrice = (price: number) => `${price.toLocaleString()}원`;
const formatDate = (date: Date) => date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

// 상품 상세 페이지 컴포넌트
interface ProductDetailPageProps {
  productId: string;
  isOpen: boolean;
  onClose: () => void;
}

const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ productId, isOpen, onClose }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<PricingOption | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [currentTotalPrice, setCurrentTotalPrice] = useState(0);
  const [remainingTime, setRemainingTime] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) {
        setError('상품 ID가 없습니다.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const fetchedProduct = await getProductById(productId);
        if (fetchedProduct) {
          setProduct(fetchedProduct);
          setCurrentImageIndex(0);
          setQuantity(1);
          if (fetchedProduct.pricingOptions && fetchedProduct.pricingOptions.length > 0) {
            setSelectedOption(fetchedProduct.pricingOptions[0]);
          } else {
            setSelectedOption(null);
          }
        } else {
          setError('상품을 찾을 수 없습니다.');
        }
      } catch (err) {
        console.error('상품 상세 정보 로딩 오류:', err);
        setError('상품 정보를 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    if (productId && isOpen) {
      fetchProduct();
    }
  }, [productId, isOpen]);

  useEffect(() => {
    if (selectedOption) {
      setCurrentTotalPrice(selectedOption.price * quantity);
    } else {
      setCurrentTotalPrice(0);
    }
  }, [selectedOption, quantity]);

  useEffect(() => {
    // 카운트다운 타이머 로직 변경
    // 1차 예약 상품 (status === 'selling') && 마감일이 아직 지나지 않은 경우 -> deadlineDate 기준
    // 추가 예약 상품 (마감일 지났지만 픽업일/입고일 전) -> pickupDate 또는 arrivalDate 기준
    const now = new Date();
    let targetDate: Date | null = null;
    let label = '';

    if (product) {
        if (product.status === 'selling' && product.deadlineDate && product.deadlineDate.toDate() > now) {
            targetDate = product.deadlineDate.toDate();
            label = '공동구매 마감';
        } else if (product.deadlineDate && now > product.deadlineDate.toDate() && product.stock !== 0) {
            // 마감일은 지났지만 재고가 남아 추가 예약 가능한 상품 (pickupDate 또는 arrivalDate 기준)
            if (product.pickupDate && product.pickupDate.toDate() > now) {
                targetDate = product.pickupDate.toDate();
                label = '픽업 가능 기한';
            } else if (product.arrivalDate && product.arrivalDate.toDate() > now) {
                targetDate = product.arrivalDate.toDate();
                label = '입고 가능 기한';
            }
        }
    }

    if (targetDate) {
      const intervalId = setInterval(() => {
        const nowMs = new Date().getTime();
        const difference = targetDate!.getTime() - nowMs; // targetDate는 null이 아님을 보장

        if (difference > 0) {
          const days = Math.floor(difference / (1000 * 60 * 60 * 24));
          const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
          setRemainingTime(`${label}: ${days}일 ${hours}시간 ${minutes}분 남음`);
        } else {
          setRemainingTime(`${label} 종료`);
          clearInterval(intervalId);
        }
      }, 1000);
      return () => clearInterval(intervalId);
    } else {
      setRemainingTime(null); // 카운트다운 표시하지 않음
    }
  }, [product]);

  const handleQuantityChange = useCallback((amount: number) => {
    setQuantity(prev => {
      const newQuantity = Math.max(1, prev + amount);
      if (!product) return prev; // 상품 정보 없으면 변경 불가

      if (product.maxOrderPerPerson !== undefined && product.maxOrderPerPerson !== null && newQuantity > product.maxOrderPerPerson) {
        alert(`1인당 최대 구매 수량은 ${product.maxOrderPerPerson}개 입니다.`);
        return prev;
      }
      // IN_STOCK 상품일 경우에만 재고 체크 (재고가 -1이면 무제한이므로 체크 안 함)
      if (product.salesType === 'IN_STOCK' && product.stock !== -1 && newQuantity > product.stock) {
        alert(`재고가 부족합니다. 현재 남은 수량은 ${product.stock}개 입니다.`);
        return prev;
      }
      return newQuantity;
    });
  }, [product]);

  const handleAddToCart = useCallback(() => {
    if (!user) {
      alert("로그인이 필요한 서비스입니다.");
      // 모달 닫고 로그인 페이지로 이동
      onClose();
      navigate('/login');
      return;
    }
    if (!product || !selectedOption) {
      alert('상품 정보 또는 옵션이 올바르지 않습니다.');
      return;
    }

    // 장바구니 담기 전에 다시 한번 재고 및 최대 구매 수량 확인
    if (product.salesType === 'IN_STOCK' && product.stock !== -1 && quantity > product.stock) {
        alert(`재고가 부족합니다. 현재 남은 수량은 ${product.stock}개 입니다.`);
        return;
    }
    if (product.maxOrderPerPerson !== undefined && product.maxOrderPerPerson !== null && quantity > product.maxOrderPerPerson) {
      alert(`1인당 최대 구매 수량은 ${product.maxOrderPerPerson}개 입니다.`);
      return;
    }

    const itemToAdd: CartItem = {
      productId: product.id,
      productName: product.name,
      selectedUnit: selectedOption.unit,
      unitPrice: selectedOption.price,
      quantity: quantity,
      imageUrl: product.imageUrls[0] || '',
      maxOrderPerPerson: product.maxOrderPerPerson ?? null,
      availableStock: product.stock, // 현재 재고
      salesType: product.salesType,
    };

    addToCart(itemToAdd);
    alert(`${product.name} 상품이 장바구니에 추가되었습니다.`);
    onClose();
    navigate('/cart');
  }, [product, selectedOption, quantity, addToCart, navigate, user, onClose]);

  const changeImage = (direction: 'prev' | 'next') => {
    if (!product || product.imageUrls.length <= 1) return;
    if (direction === 'next') {
      setCurrentImageIndex(prev => (prev === product.imageUrls.length - 1 ? 0 : prev + 1));
    } else {
      setCurrentImageIndex(prev => (prev === 0 ? product.imageUrls.length - 1 : prev - 1));
    }
  };

  const handleOptionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSelectedUnit = e.target.value;
    const newOption = product?.pricingOptions.find(opt => opt.unit === newSelectedUnit) || null;
    setSelectedOption(newOption);
  }

  if (!isOpen) return null;
  if (loading) return <div className="product-detail-modal-overlay"><div className="loading-message-modal">로딩 중...</div></div>;
  if (error || !product) return <div className="product-detail-modal-overlay" onClick={onClose}><div className="error-message-modal">{error || '상품 정보를 불러올 수 없습니다.'}</div></div>;

  const now = new Date();
  let showPurchaseControls = true; // 구매 관련 컨트롤 (수량, 담기) 표시 여부
  
  // 'SOLD OUT' 오버레이 표시 여부:
  // 재고 판매(IN_STOCK) 상품이면서 재고가 0이거나, 상품 status가 명시적으로 'sold_out'일 때
  const isSoldOutDisplay = (product.salesType === 'IN_STOCK' && product.stock === 0) || product.status === 'sold_out';

  // 구매 컨트롤 비활성화 조건:
  // 1. 예약 상품이 아직 발행되지 않은 경우 (scheduled && publishAt이 미래)
  // 2. 판매 종료 상태 (status === 'ended')
  // 3. 재고 판매 상품이면서 재고가 완전히 소진된 경우 (isSoldOutDisplay)
  // 4. 추가 예약 상품이 픽업일/입고일까지 지났는데도 재고가 없는 경우
  const isTrulyUnavailable = 
    (product.status === 'scheduled' && product.publishAt && product.publishAt.toDate() > now) ||
    product.status === 'ended' ||
    isSoldOutDisplay ||
    (product.deadlineDate && now > product.deadlineDate.toDate() && product.stock === 0 && !['PRE_ORDER_UNLIMITED'].includes(product.salesType));
    // 이전에 ADDITIONAL_RESERVATION 로직을 ProductListPage에서 처리했으므로, 
    // 여기서는 isSoldOutDisplay만으로 충분할 수 있음.
    // 하지만 만약을 위해 재고 0인 추가 예약 상품도 구매 불가능하게 명시.

  if (isTrulyUnavailable) {
    showPurchaseControls = false;
  }

  const keyDate = product.pickupDate || product.arrivalDate;
  const keyDateLabel = product.pickupDate ? '픽업일' : '입고일';
  const showOptions = product.pricingOptions && product.pricingOptions.length > 1;

  return (
    <div className="product-detail-modal-overlay" onClick={onClose}>
      <div className="product-detail-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn-top" onClick={onClose}><X size={24} /></button>
        
        <div className="image-gallery-wrapper">
          <div className="image-gallery">
            <img 
              src={product.imageUrls[currentImageIndex]} 
              alt={`${product.name} 이미지 ${currentImageIndex + 1}`} 
            />
            {product.imageUrls.length > 1 && (
              <>
                <button onClick={(e) => {e.stopPropagation(); changeImage('prev')}} className="image-nav-btn prev"><ChevronLeft size={28} /></button>
                <button onClick={(e) => {e.stopPropagation(); changeImage('next')}} className="image-nav-btn next"><ChevronRight size={28} /></button>
                <div className="image-indicator">{currentImageIndex + 1} / {product.imageUrls.length}</div>
              </>
            )}
            {isSoldOutDisplay && <div className="sold-out-overlay">SOLD OUT</div>}
          </div>
        </div>

        <div className="content-and-footer-wrapper">
          <div className="product-content-wrapper" ref={scrollRef}>
            <section className="product-header-section">
                {/* remainingTime이 있고 null이 아닐 때만 카운트다운 표시 */}
                {remainingTime && (
                    <div className="info-chip countdown">
                    <Clock size={16} />
                    <span>{remainingTime}</span>
                    </div>
                )}
                <h1 className="product-name">{product.name}</h1>
            </section>
            
            <hr className="section-divider" />
            
            <section className="product-full-description-section">
              <p>{product.description || "상세 설명이 없습니다."}</p>
            </section>

            {showOptions && (
                 <section className="product-purchase-section">
                     <label>가격 옵션</label>
                    <div className="select-wrapper">
                        <select className="price-select" value={selectedOption?.unit || ''} onChange={handleOptionChange}>
                        {product.pricingOptions.map((option) => (
                            <option key={option.unit} value={option.unit}>
                            {option.unit} ({formatPrice(option.price)})
                            </option>
                        ))}
                        </select>
                    </div>
                </section>
            )}
          </div>
          
          {showPurchaseControls && ( // 구매 컨트롤이 활성화된 경우에만 표시
            <>
              <div className="purchase-controls-wrapper">
                {keyDate && (
                    <div className="key-date-wrapper">
                        <span className="key-date-info">
                            <Calendar size={14} /> {keyDateLabel} {formatDate(keyDate.toDate())}
                        </span>
                    </div>
                )}
              </div>
              <div className="purchase-footer">
                <div className="quantity-controls-footer">
                    <button onClick={() => handleQuantityChange(-1)} disabled={quantity <= 1}>-</button>
                    <span>{quantity}</span>
                    <button 
                        onClick={() => handleQuantityChange(1)} 
                        disabled={
                            (product.salesType === 'IN_STOCK' && product.stock !== -1 && quantity >= product.stock) || // 재고 한정 상품 & 재고 초과
                            (product.maxOrderPerPerson !== undefined && product.maxOrderPerPerson !== null && quantity >= product.maxOrderPerPerson) // 1인당 최대 구매 수량 초과
                        }
                    >
                        +
                    </button>
                </div>
                <div className="price-and-cart-wrapper">
                    <span className="footer-total-price">{formatPrice(currentTotalPrice)}</span>
                    <button
                        className="add-to-cart-btn-main"
                        onClick={handleAddToCart}
                        disabled={!selectedOption || isSoldOutDisplay} // 선택된 옵션이 없거나 완전 품절이면 비활성화
                    >
                        <ShoppingCart size={20} />
                        <span>담기</span>
                    </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
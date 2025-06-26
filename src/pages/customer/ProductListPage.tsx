// src/pages/customer/ProductListPage.tsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import isEqual from 'lodash.isequal';
import { ShoppingCart, Plus, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { db, getActiveBanners } from '../../firebase';
import './ProductListPage.css'; // 아래에 제공된 CSS 코드를 사용해주세요.
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import Header from '../../components/Header';
import BannerSlider from '../../components/BannerSlider';
import ProductDetailPage from './ProductDetailPage';
import type { Product, CartItem, Banner, StorageType, SalesType } from '../../types';
import brandLogo from '../../assets/sodomall_logo.png';

type ProductStatus = 'ONSITE_SALE' | 'ONGOING' | 'ADDITIONAL_RESERVATION' | 'PAST';

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const areProductCardPropsEqual = (prevProps: any, nextProps: any) => {
    return isEqual(prevProps.product, nextProps.product) &&
           prevProps.quantity === nextProps.quantity &&
           prevProps.status === nextProps.status;
};

const MemoizedProductCard = React.memo(({ 
    product, 
    status, 
    quantity, 
    onQuantityChange,
    onAddToCart,
    onCardClick
}: { 
    product: Product; 
    status: ProductStatus; 
    quantity: number; 
    onQuantityChange: (productId: string, amount: number) => void;
    onAddToCart: (product: Product) => void;
    onCardClick: (productId: string) => void;
}) => {
    const isSoldOutForDisplay = product.salesType === 'IN_STOCK' && (product.stock === 0 || product.status === 'sold_out');
    const isPast = status === 'PAST';
    const isBuyable = !isSoldOutForDisplay && !isPast;

    const displayStock = product.salesType === 'PRE_ORDER_UNLIMITED' ? '예약 중' : `${product.stock.toLocaleString()}개`;

    const handleLocalQuantityChange = (e: React.MouseEvent, amount: number) => {
        e.stopPropagation();
        onQuantityChange(product.id, amount);
    };
    
    const handleAddToCartClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAddToCart(product);
    };

    const getStockColorClass = (stock: number, salesType: SalesType) => {
        if (salesType === 'PRE_ORDER_UNLIMITED') return ''; 
        if (stock === 0) return 'stock-color-zero';
        if (stock < 10) return 'stock-color-low';
        if (stock < 50) return 'stock-color-medium';
        return 'stock-color-high';
    };

    const getStorageTypeClass = (storageType: StorageType) => {
        switch (storageType) {
            case 'ROOM': return 'room';
            case 'CHILLED': return 'chilled';
            case 'FROZEN': return 'frozen';
            default: return '';
        }
    };

    const formatPrice = (pricingOptions: Product['pricingOptions'] = []) => {
        if (!pricingOptions || pricingOptions.length === 0) return '가격 미정';
        if (pricingOptions.length === 1) {
            return `${pricingOptions[0].price.toLocaleString()}원`;
        }
        const minPrice = Math.min(...pricingOptions.map((option: any) => option.price));
        return `${minPrice.toLocaleString()}원~`;
    };

    const formatPickupDateAndDay = (timestamp: Timestamp | undefined | null) => {
        if (!timestamp) return null;
        const date = timestamp.toDate();
        const month = (date.getMonth() + 1);
        const day = date.getDate();
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const dayOfWeek = dayNames[date.getDay()];
        return `${month}/${day}(${dayOfWeek})`;
    };

    return (
        <div className={`product-card-wrapper ${isPast ? 'past-product' : ''}`}>
            <div className="product-card" onClick={() => !isPast && onCardClick(product.id)}>
                <div className="product-image-wrapper">
                    <img src={product.imageUrls?.[0] || `https://placehold.co/400x400?text=${product.name}`} alt={product.name} className="product-image" />
                    {isSoldOutForDisplay && !isPast && <span className="product-badge sold-out">품절</span>}
                    {isPast && <span className="product-badge past-badge">판매 종료</span>}
                    {product.storageType && (
                        <span className={`storage-badge ${getStorageTypeClass(product.storageType)}`}>
                            {product.storageType === 'ROOM' && '실온'}
                            {product.storageType === 'CHILLED' && '냉장'}
                            {product.storageType === 'FROZEN' && '냉동'}
                        </span>
                    )}
                </div>
                <div className="product-content">
                    <div>
                        <h3 className="product-title-list">{product.name}</h3>
                        <div className="product-details-summary">
                            <p className="product-price-summary">{formatPrice(product.pricingOptions)}</p>
                            <div className="product-pickup-stock-details">
                                <span className="product-pickup-info">
                                    픽업: <span className="pickup-info-value">{formatPickupDateAndDay(product.pickupDate) || '미정'}</span>
                                </span>
                                <span className={`product-stock-info ${getStockColorClass(product.stock, product.salesType)}`}>
                                    재고: <span className="stock-count">{displayStock}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                    {isBuyable && (
                        <div className="quantity-control-and-cart-actions">
                            <div className="quantity-control">
                                <button onClick={(e) => handleLocalQuantityChange(e, -1)} className="quantity-button" disabled={quantity <= 1}>
                                    <Minus size={16} />
                                </button>
                                <span className="quantity-display">{quantity}</span>
                                <button onClick={(e) => handleLocalQuantityChange(e, 1)} className="quantity-button" disabled={product.salesType === 'IN_STOCK' && quantity >= product.stock}>
                                    <Plus size={16} />
                                </button>
                            </div>
                            {/* [수정] 길쭉한 장바구니 버튼으로 변경 */}
                            <button onClick={handleAddToCartClick} className="add-to-cart-button" disabled={isSoldOutForDisplay}>
                                <ShoppingCart size={18} />
                                <span>담기</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}, areProductCardPropsEqual);

// [신규] 독립적인 가로 스크롤 로직을 위한 커스텀 훅
const useHorizontalScroll = () => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [velocity, setVelocity] = useState(0);
    const animationFrameRef = useRef<number | null>(null);

    const startInertiaScroll = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        const animateScroll = () => {
            if (!scrollRef.current || Math.abs(velocity) < 0.5) {
                setVelocity(0);
                if(animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
                return;
            }

            scrollRef.current.scrollLeft += velocity;
            setVelocity(prev => prev * 0.92); // 마찰 계수
            animationFrameRef.current = requestAnimationFrame(animateScroll);
        };

        animationFrameRef.current = requestAnimationFrame(animateScroll);
    }, [velocity]);

    const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!scrollRef.current) return;
        e.preventDefault();
        setIsDragging(true);
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
        setVelocity(0);
        scrollRef.current.style.cursor = 'grabbing';
    }, []);

    const onMouseLeave = useCallback(() => {
        if (isDragging) {
            setIsDragging(false);
            startInertiaScroll();
        }
        if (scrollRef.current) {
            scrollRef.current.style.cursor = 'grab';
        }
    }, [isDragging, startInertiaScroll]);

    const onMouseUp = useCallback(() => {
        if (isDragging) {
            setIsDragging(false);
            startInertiaScroll();
        }
        if (scrollRef.current) {
            scrollRef.current.style.cursor = 'grab';
        }
    }, [isDragging, startInertiaScroll]);

    const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = x - startX;
        const newScrollLeft = scrollLeft - walk;
        
        const currentScroll = scrollRef.current.scrollLeft;
        const diff = newScrollLeft - currentScroll;
        
        scrollRef.current.scrollLeft = newScrollLeft;
        setVelocity(diff);
    }, [isDragging, startX, scrollLeft]);
    
    // [신규] 페이지 단위 스크롤 함수
    const scrollByPage = useCallback((direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const container = scrollRef.current;
            // 현재 보이는 영역의 너비만큼 스크롤하여 페이지 넘김 효과 구현
            const scrollAmount = container.clientWidth; 
            container.scrollBy({
                left: direction === 'right' ? scrollAmount : -scrollAmount,
                behavior: 'smooth',
            });
        }
    }, []); // ref는 의존성 배열에 필요 없음

    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);
    
    const mouseHandlers = { onMouseDown, onMouseLeave, onMouseUp, onMouseMove };

    return { scrollRef, mouseHandlers, scrollByPage };
};


const ProductListPage = () => {
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [activeBanners, setActiveBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const { addToCart } = useCart();
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [productQuantities, setProductQuantities] = useState<{ [productId: string]: number }>({});
    const [countdown, setCountdown] = useState<Countdown | null>(null);
    
    // [수정] 각 가로 스크롤 섹션을 위한 독립적인 훅 인스턴스 생성
    const onSiteSaleScroll = useHorizontalScroll();
    const ongoingScroll = useHorizontalScroll();
    const additionalReservationScroll = useHorizontalScroll();

    useEffect(() => {
        const fetchAllData = async () => {
            if (!user) {
                setLoading(false);
                setAllProducts([]);
                setActiveBanners([]);
                return;
            }
            
            setLoading(true);
            try {
                const bannersPromise = getActiveBanners();
                const productsQuery = query(
                    collection(db, 'products'),
                    where('isPublished', '==', true),
                    orderBy('publishAt', 'desc')
                );
                const productsPromise = getDocs(productsQuery);

                const [banners, productSnapshot] = await Promise.all([bannersPromise, productsPromise]);

                setActiveBanners(prev => isEqual(prev, banners) ? prev : banners);

                const productList = productSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                } as Product));

                if (!isEqual(allProducts, productList)) {
                    setAllProducts(productList);
                    const initialQuantities: { [productId: string]: number } = {};
                    productList.forEach(p => {
                        initialQuantities[p.id] = 1;
                    });
                    setProductQuantities(initialQuantities);
                }
            } catch (error) {
                console.error("데이터 로딩 중 오류 발생:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [user, allProducts]);

    const { onSiteSaleProducts, ongoingProducts, additionalReservationProducts, pastProducts } = useMemo(() => {
        const now = new Date();
        const onsite: Product[] = [];
        const ongoing: Product[] = [];
        const additional: Product[] = [];
        const past: Product[] = [];

        allProducts.forEach(p => {
            if (p.status === 'draft' || (p.status === 'scheduled' && p.publishAt && p.publishAt.toDate() > now)) return;
            
            const deadline = p.deadlineDate?.toDate();
            const pickupDeadline = p.pickupDeadlineDate?.toDate();

            if (p.isAvailableForOnsiteSale && p.stock > 0) {
                onsite.push(p);
            } 
            else if (p.status === 'selling' && deadline && now < deadline) {
                ongoing.push(p);
            } 
            else if (deadline && pickupDeadline && now > deadline && now < pickupDeadline && p.stock > 0) {
                additional.push(p);
            } 
            else {
                past.push(p);
            }
        });
        return { onSiteSaleProducts: onsite, ongoingProducts: ongoing, additionalReservationProducts: additional, pastProducts: past };
    }, [allProducts]);

    const fastestDeadline = useMemo(() => {
        if (ongoingProducts.length === 0) return null;
        return Math.min(...ongoingProducts.map(p => p.deadlineDate?.toMillis() || Infinity));
    }, [ongoingProducts]);

    useEffect(() => {
        if (!fastestDeadline || fastestDeadline === Infinity) {
            setCountdown(null);
            return;
        }
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = fastestDeadline - now;
            if (distance < 0) {
                clearInterval(interval);
                setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            } else {
                setCountdown({
                    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((distance % (1000 * 60)) / 1000)
                });
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [fastestDeadline]);
    
    const handleQuantityChange = useCallback((productId: string, amount: number) => {
        const product = allProducts.find(p => p.id === productId);
        if (!product) return;

        setProductQuantities(prev => {
            const currentQuantity = prev[productId] || 1;
            let newQuantity = currentQuantity + amount;
            if (newQuantity < 1) newQuantity = 1;
            if (product.salesType === 'IN_STOCK' && newQuantity > product.stock) newQuantity = product.stock;
            if (product.maxOrderPerPerson && newQuantity > product.maxOrderPerPerson) newQuantity = product.maxOrderPerPerson;
            return { ...prev, [productId]: newQuantity };
        });
    }, [allProducts]);

    const handleAddToCart = useCallback((product: Product) => {
        const quantity = productQuantities[product.id] || 1;
        const item: CartItem = {
            productId: product.id, productName: product.name,
            selectedUnit: product.pricingOptions[0].unit, unitPrice: product.pricingOptions[0].price,
            quantity: quantity, imageUrl: product.imageUrls?.[0] || 'https://via.placeholder.com/150',
            maxOrderPerPerson: product.maxOrderPerPerson, availableStock: product.stock,
            salesType: product.salesType,
        };
        addToCart(item);
        alert(`${product.name} ${quantity}개를 장바구니에 담았습니다.`);
    }, [addToCart, productQuantities]);

    const handleCardClick = useCallback((productId: string) => {
        setSelectedProductId(productId);
        setIsDetailModalOpen(true);
    }, []);

    const formatCountdown = (cd: Countdown | null) => {
        if (!cd) return null;
        if (cd.days === 0 && cd.hours === 0 && cd.minutes === 0 && cd.seconds === 0) {
            return <span className="countdown-ended">마감!</span>;
        }
        return (
            <span className="countdown-active">
                {cd.days > 0 && `${cd.days}일 `}
                {`${String(cd.hours).padStart(2, '0')}:${String(cd.minutes).padStart(2, '0')}:${String(cd.seconds).padStart(2, '0')}`}
            </span>
        );
    };

    if (loading) return <div className="loading-spinner">상품 목록을 불러오는 중...</div>;
    if (!user) return <div className="login-prompt">로그인하시면 상품 목록을 보실 수 있습니다.</div>;

    // [수정] 섹션 렌더링 함수가 scrollHook을 받도록 시그니처 변경
    const renderProductSection = (
        title: string, 
        products: Product[], 
        status: ProductStatus, 
        horizontal: boolean, 
        scrollHook?: ReturnType<typeof useHorizontalScroll>, 
        countdownTimer?: React.ReactNode
    ) => {
        if (products.length === 0 && status !== 'PAST') return null;

        return (
            <section className="product-section">
                <h2 className="section-title">
                    <span>{title}</span>
                    {countdownTimer}
                </h2>
                {products.length > 0 ? (
                    <div className="horizontal-scroll-container">
                        <div 
                            className={`product-grid ${horizontal ? 'horizontal-scroll' : ''}`}
                            ref={horizontal ? scrollHook?.scrollRef : undefined}
                            {...(horizontal && scrollHook ? scrollHook.mouseHandlers : {})}
                        >
                            {products.map(product => (
                                <MemoizedProductCard
                                    key={product.id} product={product} status={status}
                                    quantity={productQuantities[product.id] || 1}
                                    onQuantityChange={handleQuantityChange}
                                    onAddToCart={handleAddToCart}
                                    onCardClick={handleCardClick}
                                />
                            ))}
                        </div>
                        {horizontal && scrollHook && (
                            <>
                                <button className="scroll-arrow left-arrow" onClick={() => scrollHook.scrollByPage('left')}>
                                    <ChevronLeft size={32} />
                                </button>
                                <button className="scroll-arrow right-arrow" onClick={() => scrollHook.scrollByPage('right')}>
                                    <ChevronRight size={32} />
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="empty-section-text">
                         {status === 'PAST' ? '종료된 공동구매 상품이 없습니다.' : '현재 해당 상품이 없습니다.'}
                    </div>
                )}
            </section>
        );
    };

    return (
        <>
            <Header currentUserName={user?.displayName ?? '고객님'} brandLogoUrl={brandLogo} />
            <div className="customer-page-container">
                <BannerSlider banners={activeBanners} className="banner-slider-container" />
                
                {/* [수정] 각 섹션에 맞는 독립적인 scrollHook 인스턴스 전달 */}
                {renderProductSection('🏃‍♀️ 지금 바로 구매!', onSiteSaleProducts, 'ONSITE_SALE', true, onSiteSaleScroll)}
                
                {renderProductSection(
                    '🔥 공동구매 진행 중', 
                    ongoingProducts, 'ONGOING', true, ongoingScroll,
                    <span className="countdown-timer-wrapper">{formatCountdown(countdown)}</span>
                )}
                
                {renderProductSection('✨ 마감 임박! 추가 예약', additionalReservationProducts, 'ADDITIONAL_RESERVATION', true, additionalReservationScroll)}
                
                {renderProductSection('🌙 지난 공동구매', pastProducts, 'PAST', false)}
            </div>

            {isDetailModalOpen && selectedProductId && (
                <ProductDetailPage
                    productId={selectedProductId}
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                />
            )}
        </>
    );
};

export default ProductListPage;
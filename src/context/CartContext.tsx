import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { CartItem } from '../types';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string, selectedUnit: string) => void;
  updateCartItemQuantity: (productId: string, selectedUnit: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartItemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  // 로컬 스토리지에서 초기 장바구니 상태를 로드합니다.
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const storedCartItems = localStorage.getItem('cartItems');
      return storedCartItems ? JSON.parse(storedCartItems) : [];
    } catch (error) {
      console.error('Failed to parse cart items from localStorage', error);
      return [];
    }
  });

  // cartItems가 변경될 때마다 로컬 스토리지에 저장합니다.
  useEffect(() => {
    try {
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
    } catch (error) {
      console.error('Failed to save cart items to localStorage', error);
    }
  }, [cartItems]);

  // 장바구니 총액을 계산합니다.
  const cartTotal = useMemo(() => 
    cartItems.reduce((total, item) => total + (item.unitPrice * item.quantity), 0), 
    [cartItems]
  );

  // 장바구니 총 아이템 수를 계산합니다.
  const cartItemCount = useMemo(() => 
    cartItems.reduce((count, item) => count + item.quantity, 0), 
    [cartItems]
  );

  /**
   * 장바구니에 아이템을 추가하거나, 이미 있는 아이템의 수량을 업데이트합니다.
   * @param newItem 추가할 아이템 객체
   */
  const addToCart = useCallback((newItem: CartItem) => {
    setCartItems(prevItems => {
      // 동일한 상품 ID와 선택된 단위(unit)를 가진 아이템이 이미 있는지 확인합니다.
      const existingItemIndex = prevItems.findIndex(
        item => item.productId === newItem.productId && item.selectedUnit === newItem.selectedUnit
      );

      if (existingItemIndex > -1) {
        // 이미 있는 경우 수량만 업데이트합니다.
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + newItem.quantity,
        };
        return updatedItems;
      } else {
        // 없는 경우 새로 추가합니다.
        return [...prevItems, newItem];
      }
    });
  }, []);

  /**
   * 장바구니에서 특정 아이템을 제거합니다.
   * @param productId 제거할 상품의 ID
   * @param selectedUnit 제거할 상품의 단위
   */
  const removeFromCart = useCallback((productId: string, selectedUnit: string) => {
    setCartItems(prevItems => prevItems.filter(
      item => !(item.productId === productId && item.selectedUnit === selectedUnit)
    ));
  }, []);

  /**
   * 장바구니 아이템의 수량을 업데이트합니다.
   * @param productId 업데이트할 상품의 ID
   * @param selectedUnit 업데이트할 상품의 단위
   * @param quantity 새로운 수량
   */
  const updateCartItemQuantity = useCallback((productId: string, selectedUnit: string, quantity: number) => {
    setCartItems(prevItems => {
      return prevItems.map(item =>
        item.productId === productId && item.selectedUnit === selectedUnit
          ? { ...item, quantity: Math.max(1, quantity) } // 수량은 최소 1
          : item
      );
    });
  }, []);

  /**
   * 장바구니를 비웁니다.
   */
  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const value = useMemo(() => ({
    cartItems,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    clearCart,
    cartTotal,
    cartItemCount,
  }), [cartItems, addToCart, removeFromCart, updateCartItemQuantity, clearCart, cartTotal, cartItemCount]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
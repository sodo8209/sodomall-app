// src/components/BottomNav.tsx
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext'; // useCart 훅 import
import { FiHome, FiMessageSquare, FiShoppingCart, FiUser, FiSettings } from 'react-icons/fi';
import './BottomNav.css';

const BottomNav = () => {
  const { isAdmin } = useAuth();
  const { cartItemCount } = useCart(); // cartItemCount 가져오기

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) => {
    return "nav-link" + (isActive ? " active" : "");
  };

  return (
    <nav className="bottom-nav">
      <NavLink to="/" className={getNavLinkClass} end>
        <FiHome />
        <span>홈</span>
      </NavLink>
      <NavLink to="/board" className={getNavLinkClass}>
        <FiMessageSquare />
        <span>공구 요청</span>
      </NavLink>
      <NavLink to="/cart" className={getNavLinkClass}>
        <div className="cart-icon-wrapper"> {/* 뱃지를 위한 래퍼 추가 */}
          <FiShoppingCart />
          {cartItemCount > 0 && ( // cartItemCount가 0보다 클 때만 뱃지 표시
            <span className="cart-badge">{cartItemCount}</span>
          )}
        </div>
        <span>장바구니</span>
      </NavLink>
      <NavLink to="/mypage" className={getNavLinkClass}>
        <FiUser />
        <span>마이페이지</span>
      </NavLink>
      
      {isAdmin && (
        <NavLink to="/admin" className={getNavLinkClass}>
          <FiSettings />
          <span>관리자</span>
        </NavLink>
      )}
    </nav>
  );
};

export default BottomNav;
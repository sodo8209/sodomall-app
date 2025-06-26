// src/pages/customer/MyPage.tsx

import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { FiChevronRight } from 'react-icons/fi';
import Header from '../../components/Header';
import './MyPage.css';

const MyPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("로그아웃 오류:", error);
    }
  };

  return (
    <>
      <Header title="마이페이지" />
      <div className="mypage-container">
        <div className="profile-section">
          <h2>{user?.displayName || '사용자'}님</h2>
          <p>오늘도 소도몰과 함께 즐거운 쇼핑되세요!</p>
        </div>

        <nav className="mypage-nav">
          <ul className="mypage-menu-list">
            <li onClick={() => navigate('/mypage/history')}>
              <span>예약 내역</span>
              <FiChevronRight />
            </li>
            <li onClick={() => navigate('/mypage/orders')}>
              <span>주문 달력</span>
              <FiChevronRight />
            </li>
            <li onClick={() => navigate('/mypage/arrivals')}>
              <span>입고 달력</span>
              <FiChevronRight />
            </li>
            <li onClick={() => alert('마감된 상품 목록 페이지로 이동합니다.')}>
              <span>마감된 상품 목록</span>
              <FiChevronRight />
            </li>
            {/* [추가됨] 매장 정보 메뉴 */}
            <li onClick={() => navigate('/mypage/store-info')}>
              <span>매장 정보</span>
              <FiChevronRight />
            </li>
          </ul>
        </nav>

        <div className="logout-section">
          <button onClick={handleLogout} className="logout-button">
            로그아웃
          </button>
        </div>
      </div>
    </>
  );
};

export default MyPage;
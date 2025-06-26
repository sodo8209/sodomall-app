// src/components/Header.tsx
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Bell } from 'lucide-react';
import './Header.css';

// Notification 타입 정의 (AuthContext와 일치하도록 정의)
interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  timestamp: Date; // AuthContext의 타입과 일치하도록 유지
}

interface HeaderProps {
  title?: string;
  brandLogoUrl?: string;
  onBack?: () => void;
  currentUserName?: string;
  notifications?: Notification[];
  onMarkAsRead?: (notificationId: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  title,
  brandLogoUrl,
  onBack,
  currentUserName,
  notifications = [],
  onMarkAsRead,
}) => {
  const [currentDate, setCurrentDate] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const date = today.getDate();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = dayNames[today.getDay()];
    setCurrentDate(`${month}/${date} (${dayOfWeek})`);
  }, []);

  // 환영 메시지 추가
  const greetingMessage = currentUserName ? `${currentUserName}님, 안녕하세요!` : '안녕하세요!';

  // 읽지 않은 알림 개수 계산
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="main-header">
      <div className="header-left">
        {onBack && (
          <button onClick={onBack} className="header-back-button">
            <ChevronLeft size={24} color="#333" />
          </button>
        )}
        {/* 제목이 있으면 제목을, 없으면 날짜를 표시 */}
        <span className="current-date">{title || currentDate}</span> {/* 날짜는 항상 표시되도록 변경 */}
      </div>
      <div className="header-center">
        {brandLogoUrl && (
          <div className="brand-logo-container">
            <img src={brandLogoUrl} alt="Brand Logo" className="brand-logo" />
          </div>
        )}
      </div>
      <div className="header-actions">
        {/* 알림 버튼 추가 */}
        {notifications && notifications.length > 0 && (
          <div className="notification-container">
            <button
              className="notification-button"
              onClick={() => setShowNotifications(prev => !prev)}
            >
              <Bell size={20} />
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>
            {showNotifications && (
              <div className="notification-dropdown">
                <h4>알림</h4>
                {notifications.length > 0 ? (
                  <ul>
                    {notifications.map(notification => (
                      <li
                        key={notification.id}
                        className={notification.isRead ? 'read' : 'unread'}
                        onClick={() => onMarkAsRead?.(notification.id)}
                      >
                        {notification.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>새로운 알림이 없습니다.</p>
                )}
              </div>
            )}
          </div>
        )}
        {/* 환영 메시지 다시 추가 */}
        <span className="greeting-message">{greetingMessage}</span>
      </div>
    </header>
  );
};

export default Header;
// src/pages/admin/UserListPage.tsx

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../firebase';

interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'customer';
  noShowCount?: number; // 노쇼 횟수
  isRestricted?: boolean; // 이용 제한 여부
}

const UserListPage = () => {
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // 실시간 업데이트를 위해 onSnapshot 사용
    const usersQuery = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(usersQuery, (querySnapshot) => {
        const usersData = querySnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        } as AppUser));
        setAllUsers(usersData);
        // 검색어 유지를 위해 필터링된 목록도 함께 업데이트하지 않고,
        // searchTerm, allUsers 의존성 useEffect에서 처리하도록 합니다.
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const results = allUsers.filter(user =>
      (user.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(results);
  }, [searchTerm, allUsers]);

  if (isLoading) return <div>사용자 목록을 불러오는 중...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: 0 }}>전체 고객 관리</h1>
        <input
          type="text"
          placeholder="이름 또는 이메일로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: '10px', width: '300px', borderRadius: '6px', border: '1px solid #ccc' }}
        />
      </div>
      <div style={{ backgroundColor: 'white', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)', borderRadius: '0.5rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead>
            <tr>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>이름</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>이메일</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>권한</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>노쇼</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>상태</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>상세 보기</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.uid}>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>{user.displayName || '이름 없음'}</td>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>{user.email}</td>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ textTransform: 'uppercase', fontWeight: 600, color: user.role === 'admin' ? '#ef4444' : '#6b7280' }}>
                    {user.role}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontWeight: 600, color: (user.noShowCount || 0) > 0 ? '#ef4444' : 'inherit' }}>
                  {user.noShowCount || 0} 회
                </td>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                  {user.isRestricted && <span style={{color: 'white', backgroundColor: '#ef4444', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem'}}>이용 제한중</span>}
                </td>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                  <Link to={`/admin/users/${user.uid}`} style={{ color: '#007bff', fontWeight: '600' }}>
                    관리
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && <p style={{ textAlign: 'center', padding: '20px' }}>결과가 없습니다.</p>}
      </div>
    </div>
  );
};

export default UserListPage;
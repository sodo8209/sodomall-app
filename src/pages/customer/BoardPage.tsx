// src/pages/customer/BoardPage.tsx

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import './BoardPage.css'; // 새로운 CSS 파일 임포트

// Post 타입 정의 (프로젝트에 맞게 수정)
interface Post {
  id: string;
  title: string;
  content: string;
  authorName?: string;
  createdAt: any;
}

const BoardPage = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // useAuth 훅을 사용하여 사용자 정보와 '인증 로딩' 상태를 가져옵니다.
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // 인증 로딩이 끝나고, user 객체가 존재할 때만 데이터 로딩을 시작합니다.
    if (authLoading) {
      // 인증 정보가 로딩 중이면 아무 작업도 하지 않고 대기합니다.
      return;
    }

    if (!user) {
      // 사용자가 로그인되어 있지 않으면 데이터 로딩을 하지 않습니다.
      setDataLoading(false);
      return;
    }

    const postsQuery = query(collection(db, 'board'), orderBy('createdAt', 'desc'));
    
    // onSnapshot: 실시간으로 데이터 변경을 감지합니다.
    const unsubscribe = onSnapshot(postsQuery, (querySnapshot) => {
      const postsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setPosts(postsData);
      setDataLoading(false);
    }, (err: any) => {
      console.error("게시글 실시간 로딩 오류:", err);
      if (err.code === 'permission-denied') {
        setError("게시글을 볼 수 있는 권한이 없습니다.");
      } else {
        setError("데이터를 불러오는 중 오류가 발생했습니다.");
      }
      setDataLoading(false);
    });

    // 클린업 함수: 컴포넌트가 사라질 때 실시간 감지를 중단하여 메모리 누수를 방지합니다.
    return () => unsubscribe();

  }, [user, authLoading]); // user 또는 authLoading이 변경될 때 useEffect를 다시 실행합니다.

  // 1. 인증 정보 로딩 중일 때
  if (authLoading) {
    return <div className="board-page-container">사용자 정보를 확인 중입니다...</div>;
  }
  
  // 2. 데이터 로딩 중일 때
  if (dataLoading) {
    return <div className="board-page-container">게시글 목록을 불러오는 중...</div>;
  }
  
  // 3. 에러 발생 시
  if (error) {
    return <div className="board-page-container error-message">오류: {error}</div>;
  }

  return (
    <div className="board-page-container">
      <h1 className="board-page-header">공구 요청 게시판</h1>
      <main className="post-list">
        {posts.length > 0 ? (
          posts.map(post => (
            <article key={post.id} className="post-item">
              <h2 className="post-title">{post.title}</h2>
              <p className="post-content">{post.content}</p>
            </article>
          ))
        ) : (
          <p className="no-posts-message">아직 작성된 게시글이 없습니다.</p>
        )}
      </main>
    </div>
  );
};

export default BoardPage;
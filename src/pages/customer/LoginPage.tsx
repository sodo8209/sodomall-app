import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from '../../firebase'; // src/pages/customer/ 에서 src/firebase.ts 로 접근 (경로 올바름)
// import { getAuth } from './firebase'; // [삭제] getAuth는 auth 객체를 가져올 때 직접 사용되지 않으므로 제거
import './LoginPage.css';

const LoginPage: React.FC = () => { // React.FC를 사용하므로 'React' is declared... 경고 해결
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/'); // 로그인 성공 시 메인 페이지로 이동
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/'); // 로그인 성공 시 메인 페이지로 이동
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>로그인</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="login-button">로그인</button>
        </form>
        <div className="social-login-options">
          <button onClick={handleGoogleLogin} className="google-login-button">
            Google로 로그인
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
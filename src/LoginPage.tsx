import { OAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./firebase";

const LoginPage = () => {
  const handleKakaoLogin = async () => {
    // 바로 이 부분의 "kakao.com"을 "oidc.kakao"로 수정해야 합니다.
    const provider = new OAuthProvider("oidc.kakao"); 
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("로그인 성공!", user);
      alert(`환영합니다, ${user.displayName}님!`);
    } catch (error) {
      console.error("로그인 중 오류 발생:", error);
      alert("로그인에 실패했습니다. 다시 시도해 주세요.");
    }
  };

  return (
    <div>
      <h1>소도몰</h1>
      <p>가장 빠르고 간편한 공동구매</p>
      <button onClick={handleKakaoLogin}>
        카카오로 3초만에 시작하기
      </button>
    </div>
  );
};

export default LoginPage;
// src/firebase.ts

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// .env 파일에서 Firebase 설정 정보 가져오기
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
};

// Firebase 앱 초기화 (이 부분이 활성화되어야 합니다!)
const app = initializeApp(firebaseConfig);

// 다른 파일에서 사용할 수 있도록 Firebase 서비스 내보내기
export const auth = getAuth(app); // 로그인 및 인증 담당
export const db = getFirestore(app); // 데이터베이스(Firestore) 담당
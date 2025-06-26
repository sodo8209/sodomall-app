// src/firebase/firebaseConfig.ts
import { initializeApp, getApps, getApp } from 'firebase/app'; // [수정] getApps, getApp 추가
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';
import type { FirebaseStorage } from 'firebase/storage';

// .env 파일에서 환경 변수를 가져옵니다.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_APP_API_KEY as string,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_APP_ID as string,
  // measurementId: import.meta.env.VITE_APP_MEASUREMENT_ID as string,
};

// Firebase 앱 초기화 로직 수정:
// 이미 초기화된 앱이 있는지 확인하고, 있다면 기존 앱을 사용합니다.
// 없다면 새로 초기화합니다.
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp(); // [수정] 앱 중복 초기화 방지

// 서비스 인스턴스 가져오기 및 내보내기
export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(app);
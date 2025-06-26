// sodomall-app/src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, query, collection, where, onSnapshot, orderBy, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase"; // src/context/ 에서 src/firebase.ts 로 접근

import type { ReactNode } from 'react';
import type { User } from "firebase/auth";

// [수정] NotificationBell과 공유할 타입을 여기서 정의하고 export 합니다.
export interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  timestamp: Date;
  link?: string;
}

interface AppUserContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  notifications: Notification[];
  handleMarkAsRead: (id: string) => void;
}

export const AuthContext = createContext<AppUserContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다.');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      let unsubNotifs: () => void = () => {};

      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          try {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              createdAt: serverTimestamp(),
              isAdmin: false,
            });
            setIsAdmin(false);
            console.log("Firestore에 새 유저 정보를 생성했습니다.");
          } catch (error) {
            console.error("첫 로그인 유저 정보 저장 실패:", error);
          }
        } else {
          setIsAdmin(userSnap.data().isAdmin === true);
        }
        
        setUser(currentUser);
        
        const q = query(collection(db, "notifications"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
        unsubNotifs = onSnapshot(q, (snapshot) => {
          // [수정] Firestore Timestamp를 Date 객체로 변환하여 타입 불일치 해결
          const newNotifications = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            timestamp: d.data().createdAt?.toDate() || new Date() // createdAt을 Date 객체로 변환
          }) as Notification);
          setNotifications(newNotifications);
        });

      } else {
        setUser(null);
        setIsAdmin(false);
        setNotifications([]);
      }

      setLoading(false);
      
      return () => unsubNotifs();
    });

    return () => unsubAuth();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    const notifRef = doc(db, "notifications", id);
    await updateDoc(notifRef, { isRead: true });
  };

  const value = { user, isAdmin, loading, notifications, handleMarkAsRead };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

const FALLBACK_ADMIN_EMAIL = 'engffsantos@gmail.com';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          const adminSnap = await getDoc(doc(db, 'admins', currentUser.uid));
          setIsAdmin(adminSnap.exists() || currentUser.email === FALLBACK_ADMIN_EMAIL);
        } catch (error) {
          console.error('Error checking admin role:', error);
        }

        // Sync user profile to Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              name: currentUser.displayName || 'Usuário',
              photoURL: currentUser.photoURL || '',
              role: 'user',
              status: 'active',
              totalPoints: 0,
              exactScoreHits: 0,
              resultHits: 0,
              goalHits: 0,
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            });
          } else {
            await setDoc(userRef, {
              name: currentUser.displayName || userSnap.data().name,
              photoURL: currentUser.photoURL || userSnap.data().photoURL,
              lastLoginAt: new Date().toISOString(),
            }, { merge: true });
          }
        } catch (error) {
          console.error('Error syncing user profile:', error);
        }
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

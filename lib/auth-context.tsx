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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Sync user profile to Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          try {
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
          } catch (error) {
            console.error('Error creating user profile:', error);
          }
        } else {
          try {
            // Check if admin
            const adminRef = doc(db, 'admins', currentUser.uid);
            const adminSnap = await getDoc(adminRef);
            setIsAdmin(adminSnap.exists() || currentUser.email === 'engffsantos@gmail.com');
            
            await setDoc(userRef, {
              ...userSnap.data(),
              name: currentUser.displayName || userSnap.data().name,
              photoURL: currentUser.photoURL || userSnap.data().photoURL,
              lastLoginAt: new Date().toISOString(),
            }, { merge: true });
          } catch (error) {
            console.error('Error updating user login time:', error);
          }
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

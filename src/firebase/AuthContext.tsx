// AuthContext.tsx

import React, { useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from './config';

interface AuthContextProps {
  user: User | null;
  loading: boolean; // Add loading state
}

const AuthContext = React.createContext<AuthContextProps>({ user: null, loading: true });

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false); // Stop loading once firebaseUser is determined
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
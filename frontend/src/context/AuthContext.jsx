import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

import { auth } from '../firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email
        });
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const register = async (email, password) => {
    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const userData = {
      uid: result.user.uid,
      email: result.user.email
    };

    setUser(userData);

    return result.user;
  };

  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const userData = {
      uid: result.user.uid,
      email: result.user.email
    };

    setUser(userData);

    return result.user;
  };

  const setAuthenticatedUser = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        register,
        login,
        setAuthenticatedUser,
        logout,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
import { createContext, useState } from 'react';
import { login as apiLogin, logout as apiLogout, getToken } from '../api/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuth, setIsAuth] = useState(!!getToken());

  const login = async (email, password) => {
    const success = await apiLogin(email, password);
    if (success) setIsAuth(true);
    return success;
  };

  const logout = () => {
    apiLogout();
    setIsAuth(false);
  };

  return (
    <AuthContext.Provider value={{ isAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
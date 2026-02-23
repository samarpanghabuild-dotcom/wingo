import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        try {
          const response = await axios.get(`${API}/user/profile`);
          setUser(response.data);
        } catch (error) {
          console.error('Failed to fetch profile:', error);
          localStorage.removeItem('token');
          setToken(null);
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };
    
    initAuth();
  }, []);

  const refreshBalance = async () => {
    try {
      const response = await axios.get(`${API}/user/profile`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, refreshBalance }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface AuthUser {
  name: string;
  email: string;
  balance: number;
  createdAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  register: (name: string, email: string, password: string) => void;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const STORAGE_KEY = 'php-skript-user';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (u: AuthUser | null) => {
    setUser(u);
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  };

  const register = (name: string, email: string) => {
    persist({
      name,
      email,
      balance: 0,
      createdAt: new Date().toLocaleDateString('ru-RU'),
    });
  };

  const login = (email: string) => {
    // v1: демо-вход — восстанавливаем/создаём профиль по e-mail
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as AuthUser;
      if (saved.email === email) {
        persist(saved);
        return true;
      }
    }
    persist({
      name: email.split('@')[0],
      email,
      balance: 0,
      createdAt: new Date().toLocaleDateString('ru-RU'),
    });
    return true;
  };

  const logout = () => persist(null);

  return (
    <AuthContext.Provider value={{ user, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

import { createContext, useContext, useMemo, useState, ReactNode } from 'react'
type User = { token: string; displayName: string; role: string; userId: number }
const Ctx = createContext<{ user: User | null; login: (u: User) => void; logout: () => void }>({ user: null, login: () => {}, logout: () => {} })
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try { const r = localStorage.getItem('user'); return r ? JSON.parse(r) : null } catch { return null }
  })
  const login = (u: User) => { localStorage.setItem('token', u.token); localStorage.setItem('user', JSON.stringify(u)); setUser(u) }
  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null) }
  return <Ctx.Provider value={useMemo(() => ({ user, login, logout }), [user])}>{children}</Ctx.Provider>
}
export const useAuth = () => useContext(Ctx)

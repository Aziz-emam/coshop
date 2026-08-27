import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItemButton, ListItemText, Box, Button } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import { useAuth } from '../features/auth'
import api from '../api/client'

export default function Layout() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('المالية')
  const [partnersTitle, setPartnersTitle] = useState('الشركاء')
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  useEffect(() => {
    api.get('/Finance/settings').then(r => {
      setTitle(r.data.businessName || 'المالية')
      setPartnersTitle(r.data.partnersPageTitle || 'الشركاء')
    }).catch(() => {})
  }, [loc.pathname])
  const links = [
    { t: 'الرئيسية', p: '/' },
    { t: 'الواردات', p: '/incomes' },
    { t: 'المصروفات', p: '/expenses' },
    { t: partnersTitle, p: '/partners' },
    { t: 'الموظفون', p: '/employees' },
    { t: 'التقارير', p: '/reports' },
    { t: 'الإعدادات', p: '/settings', owner: true },
  ]
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7f5' }}>
      <AppBar position="sticky" sx={{ bgcolor: '#1b5e20' }}>
        <Toolbar>
          <IconButton color="inherit" onClick={() => setOpen(true)}><MenuIcon /></IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, textAlign: 'center', fontWeight: 'bold' }}>{title}</Typography>
          <Typography variant="body2" sx={{ mx: 1 }}>{user?.displayName}</Typography>
          <Button color="inherit" onClick={() => { logout(); nav('/login') }}>خروج</Button>
        </Toolbar>
      </AppBar>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 260, pt: 2 }}>
          <List>
            {links.filter(l => !l.owner || user?.role === 'Owner').map(l => (
              <ListItemButton key={l.p} selected={loc.pathname === l.p} onClick={() => { nav(l.p); setOpen(false) }}>
                <ListItemText primary={l.t} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box sx={{ p: 2, maxWidth: 1100, mx: 'auto' }}><Outlet /></Box>
    </Box>
  )
}

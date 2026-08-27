import { useState } from 'react'
import { Box, Paper, TextField, Button, Typography } from '@mui/material'
import api from '../api/client'
import { useAuth } from '../features/auth'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

export default function LoginPage() {
  const [username, setUsername] = useState('owner')
  const [password, setPassword] = useState('Owner@123')
  const { login } = useAuth()
  const nav = useNavigate()
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#e8f5e9' }}>
      <Paper sx={{ p: 4, width: 360 }}>
        <Typography variant="h5" fontWeight="bold" textAlign="center" gutterBottom>المالية</Typography>
        <TextField fullWidth size="small" label="المستخدم" sx={{ mb: 2 }} value={username} onChange={e => setUsername(e.target.value)} />
        <TextField fullWidth size="small" type="password" label="كلمة المرور" sx={{ mb: 2 }} value={password} onChange={e => setPassword(e.target.value)} />
        <Button fullWidth variant="contained" onClick={async () => {
          try {
            const r = await api.post('/Auth/login', { username, password })
            login({ token: r.data.token, displayName: r.data.displayName, role: r.data.role, userId: r.data.userId })
            nav('/')
          } catch (e: any) { toast.error(e?.response?.data?.message || 'فشل الدخول') }
        }}>دخول</Button>
      </Paper>
    </Box>
  )
}

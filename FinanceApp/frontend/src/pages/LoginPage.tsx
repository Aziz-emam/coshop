import { useState } from 'react'
import { Box, Paper, TextField, Button, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth'
import { toast } from 'react-toastify'

export default function LoginPage() {
  const [u, setU] = useState(''); const [p, setP] = useState('')
  const { login } = useAuth(); const nav = useNavigate()
  const submit = async () => {
    try { await login(u, p); nav('/') } catch (e: any) { toast.error(e?.response?.data?.message || 'فشل') }
  }
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#e8f5e9' }}>
      <Paper sx={{ p: 4, width: 360 }}>
        <Typography variant="h5" fontWeight="bold" textAlign="center" gutterBottom>المالية</Typography>
        <TextField fullWidth label="اسم المستخدم" value={u} onChange={e => setU(e.target.value)} sx={{ mb: 2 }} />
        <TextField fullWidth type="password" label="كلمة المرور" value={p} onChange={e => setP(e.target.value)} sx={{ mb: 2 }}
          onKeyDown={e => e.key === 'Enter' && submit()} />
        <Button fullWidth variant="contained" size="large" onClick={submit}>دخول</Button>
      </Paper>
    </Box>
  )
}

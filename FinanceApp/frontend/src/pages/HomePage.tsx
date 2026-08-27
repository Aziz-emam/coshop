import { useEffect, useState } from 'react'
import { Box, Typography, Paper, Button, Grid, Alert, CircularProgress } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { toast } from 'react-toastify'
import { useAuth } from '../features/auth'

export default function HomePage() {
  const [day, setDay] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const nav = useNavigate()
  const { user } = useAuth()

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/Finance/days/current')
      setDay(r.data ?? null)
    } catch {
      setDay(null)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const openDay = async () => {
    try {
      const r = await api.post('/Finance/days/open')
      toast.success(`تم فتح يوم ${new Date(r.data.date).toLocaleDateString('ar-EG')}`)
      setDay(r.data)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'فشل فتح اليوم')
    }
  }

  const reopen = async () => {
    if (!day) return
    try {
      await api.post(`/Finance/days/${day.id}/reopen`)
      toast.success('تم إعادة فتح اليوم')
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'فشل')
    }
  }

  const closeDay = async () => {
    if (!day) return
    try {
      await api.post(`/Finance/days/${day.id}/close`)
      toast.success('تم إقفال اليوم')
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'فشل')
    }
  }

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>جاري التحميل…</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>لوحة اليوم</Typography>

      {!day && (
        <Paper sx={{ p: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            لا يوجد يوم عمل بعد. اضغط لفتح أول يوم (أو اليوم التالي بعد آخر يوم مقفل).
          </Alert>
          <Button variant="contained" size="large" onClick={openDay}>فتح يوم عمل</Button>
        </Paper>
      )}

      {day && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6">
            تاريخ: {new Date(day.date).toLocaleDateString('ar-EG')} —{' '}
            {day.status === 'Open' ? 'مفتوح' : 'مقفل'}
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {[
              ['افتتاحي', day.openingBalance],
              ['واردات', day.totalIncome],
              ['مصروفات', day.totalExpense],
              ['صافي اليوم', day.net],
            ].map(([l, v]) => (
              <Grid item xs={6} sm={3} key={String(l)}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f1f8e9' }}>
                  <Typography color="text.secondary" variant="body2">{l as string}</Typography>
                  <Typography variant="h6" fontWeight="bold">{Number(v).toFixed(2)}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={1} sx={{ mt: 2 }}>
            <Grid item xs={6} sm={3}>
              <Button fullWidth variant="contained" color="success" onClick={() => nav('/incomes')}>الواردات</Button>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Button fullWidth variant="contained" color="secondary" onClick={() => nav('/expenses')}>المصروفات</Button>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Button fullWidth variant="outlined" onClick={() => nav(`/day/${day.id}`)}>تفاصيل اليوم</Button>
            </Grid>
            <Grid item xs={6} sm={3}>
              {day.status === 'Open' ? (
                <Button fullWidth color="error" variant="outlined" onClick={closeDay}>إقفال اليوم</Button>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button fullWidth variant="contained" onClick={openDay}>فتح يوم جديد (التالي)</Button>
                  {user?.role === 'Owner' && (
                    <Button fullWidth size="small" color="warning" onClick={reopen}>
                      إعادة فتح هذا اليوم (مالك)
                    </Button>
                  )}
                </Box>
              )}
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  )
}

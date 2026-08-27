import { useEffect, useState } from 'react'
import { Box, Typography, Paper, Button, Grid, TextField, CircularProgress } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { toast } from 'react-toastify'

export default function HomePage() {
  const [d, setD] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dayDate, setDayDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dayNet, setDayNet] = useState<any>(null)
  const nav = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/Finance/dashboard')
      setD(r.data)
    } catch { toast.error('تعذر التحميل') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const loadDayNet = async () => {
    try {
      const r = await api.get('/Finance/day-net', { params: { date: dayDate } })
      setDayNet(r.data)
    } catch { toast.error('تعذر حساب صافي اليوم') }
  }

  if (loading && !d) {
    return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /><Typography sx={{ mt: 2 }}>جاري التحميل…</Typography></Box>
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight="bold">لوحة التراكمي</Typography>
        <Button variant="outlined" onClick={load}>تحديث</Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          ['إجمالي الواردات', d?.totalIncome, '#e8f5e9'],
          ['إجمالي المصروفات', d?.totalExpense, '#ffebee'],
          ['الصافي', d?.net, '#e3f2fd'],
        ].map(([l, v, bg]) => (
          <Grid item xs={12} sm={4} key={String(l)}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: bg as string }}>
              <Typography color="text.secondary">{l as string}</Typography>
              <Typography variant="h4" fontWeight="bold">{Number(v || 0).toFixed(2)}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        عدد القيود: وارد {d?.incomeCount || 0} · مصروف {d?.expenseCount || 0}
        {d?.lastOperationAt && (
          <> · آخر عملية: {d.lastOperationType} — {new Date(d.lastOperationAt).toLocaleString('ar-EG')}</>
        )}
      </Typography>

      <Grid container spacing={1} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}><Button fullWidth variant="contained" color="success" onClick={() => nav('/incomes')}>الواردات</Button></Grid>
        <Grid item xs={6} sm={3}><Button fullWidth variant="contained" color="secondary" onClick={() => nav('/expenses')}>المصروفات</Button></Grid>
        <Grid item xs={6} sm={3}><Button fullWidth variant="outlined" onClick={() => nav('/reports')}>التقارير</Button></Grid>
        <Grid item xs={6} sm={3}><Button fullWidth variant="outlined" onClick={() => nav('/partners')}>الشركاء</Button></Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography fontWeight="bold" gutterBottom>صافي يوم محدد</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          صافي اليوم = واردات ذلك التاريخ − مصروفاته. التراكمي قبل/بعد للتوضيح.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <TextField type="date" size="small" value={dayDate} onChange={e => setDayDate(e.target.value)} InputLabelProps={{ shrink: true }} label="التاريخ" />
          <Button variant="contained" onClick={loadDayNet}>احسب</Button>
        </Box>
        {dayNet && (
          <Grid container spacing={1}>
            <Grid item xs={6} sm={2}><Paper sx={{ p: 1, textAlign: 'center' }}><Typography variant="caption">وارد اليوم</Typography><Typography fontWeight="bold">{dayNet.income}</Typography></Paper></Grid>
            <Grid item xs={6} sm={2}><Paper sx={{ p: 1, textAlign: 'center' }}><Typography variant="caption">مصروف اليوم</Typography><Typography fontWeight="bold">{dayNet.expense}</Typography></Paper></Grid>
            <Grid item xs={6} sm={2}><Paper sx={{ p: 1, textAlign: 'center' }}><Typography variant="caption">صافي اليوم</Typography><Typography fontWeight="bold">{dayNet.dayNet}</Typography></Paper></Grid>
            <Grid item xs={6} sm={3}><Paper sx={{ p: 1, textAlign: 'center' }}><Typography variant="caption">تراكمي قبل اليوم</Typography><Typography fontWeight="bold">{dayNet.cumulativeBefore}</Typography></Paper></Grid>
            <Grid item xs={6} sm={3}><Paper sx={{ p: 1, textAlign: 'center' }}><Typography variant="caption">تراكمي بعد اليوم</Typography><Typography fontWeight="bold">{dayNet.cumulativeAfter}</Typography></Paper></Grid>
          </Grid>
        )}
      </Paper>
    </Box>
  )
}

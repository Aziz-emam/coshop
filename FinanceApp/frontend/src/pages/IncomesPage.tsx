import { useEffect, useState } from 'react'
import {
  Box, Typography, Paper, Button, TextField, MenuItem, Grid, Table, TableHead, TableRow, TableCell, TableBody, Alert, CircularProgress
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { toast } from 'react-toastify'
import { useAuth } from '../features/auth'

const sourceLabel = (s: string) =>
  s === 'KidsArea' ? 'كيدز اريا' : s === 'CoffeeShop' ? 'كوفي شوب' : 'أخرى'

export default function IncomesPage() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [loading, setLoading] = useState(true)
  const [day, setDay] = useState<any>(null)
  const [detail, setDetail] = useState<any>(null)
  const [form, setForm] = useState({ source: 1, amount: 0, notes: '' })

  const load = async () => {
    setLoading(true)
    try {
      const cur = await api.get('/Finance/days/current')
      if (!cur.data) { setDay(null); setDetail(null); return }
      setDay(cur.data)
      const d = await api.get(`/Finance/days/${cur.data.id}`)
      setDetail(d.data)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'تعذر التحميل')
      setDay(null); setDetail(null)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const closed = day?.status === 'Closed'
  const canEdit = !!day && (!closed || user?.role === 'Owner')

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>جاري التحميل…</Typography>
      </Box>
    )
  }

  if (!day) {
    return (
      <Box>
        <Typography variant="h5" fontWeight="bold" gutterBottom>الواردات</Typography>
        <Alert severity="warning">لا يوجد يوم عمل. من الرئيسية افتح يوماً أولاً.</Alert>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => nav('/')}>الرئيسية</Button>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>الواردات</Typography>
      <Typography sx={{ mb: 1 }}>
        يوم {new Date(day.date).toLocaleDateString('ar-EG')} — {closed ? 'مقفل' : 'مفتوح'} — إجمالي: <b>{day.totalIncome}</b>
      </Typography>
      {closed && <Alert severity="info" sx={{ mb: 1 }}>اليوم مقفل — الإضافة للمالك فقط</Alert>}

      {canEdit && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={1}>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" select label="المصدر" value={form.source}
                onChange={e => setForm({ ...form, source: +e.target.value })}>
                <MenuItem value={1}>كيدز اريا</MenuItem>
                <MenuItem value={2}>كوفي شوب</MenuItem>
                <MenuItem value={3}>أخرى</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth size="small" type="number" label="المبلغ" value={form.amount}
                onChange={e => setForm({ ...form, amount: +e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth size="small" label="تعليق" value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button fullWidth variant="contained" onClick={async () => {
                if (!form.amount || form.amount <= 0) return toast.error('أدخل مبلغاً صحيحاً')
                try {
                  await api.post(`/Finance/days/${day.id}/incomes`, form)
                  toast.success('تم'); setForm({ source: 1, amount: 0, notes: '' }); load()
                } catch (e: any) { toast.error(e?.response?.data?.message || 'فشل') }
              }}>حفظ</Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Table size="small" component={Paper}>
        <TableHead>
          <TableRow>
            <TableCell>المصدر</TableCell>
            <TableCell>المبلغ</TableCell>
            <TableCell>تعليق</TableCell>
            <TableCell>بواسطة</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(detail?.incomes || []).map((x: any) => (
            <TableRow key={x.id}>
              <TableCell>{sourceLabel(String(x.source))}</TableCell>
              <TableCell>{x.amount}</TableCell>
              <TableCell>{x.notes || '—'}</TableCell>
              <TableCell>{x.createdByName}</TableCell>
              <TableCell>
                {canEdit && (
                  <Button size="small" color="error" onClick={async () => {
                    if (!confirm('حذف؟')) return
                    await api.delete(`/Finance/incomes/${x.id}`); load()
                  }}>حذف</Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {!(detail?.incomes?.length) && (
            <TableRow><TableCell colSpan={5}>لا توجد واردات</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  )
}

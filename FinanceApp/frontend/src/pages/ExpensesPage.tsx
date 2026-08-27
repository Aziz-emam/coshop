import { useEffect, useState } from 'react'
import {
  Box, Typography, Paper, Button, TextField, MenuItem, Grid, Table, TableHead, TableRow, TableCell, TableBody, Alert, CircularProgress
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { toast } from 'react-toastify'
import { useAuth } from '../features/auth'

export default function ExpensesPage() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [loading, setLoading] = useState(true)
  const [day, setDay] = useState<any>(null)
  const [detail, setDetail] = useState<any>(null)
  const [cats, setCats] = useState<any[]>([])
  const [partners, setPartners] = useState<any[]>([])
  const [emps, setEmps] = useState<any[]>([])
  const [form, setForm] = useState({ categoryId: 0, amount: 0, notes: '', partnerId: '', employeeId: '' })

  const loadDay = async () => {
    setLoading(true)
    try {
      const cur = await api.get('/Finance/days/current')
      if (!cur.data) {
        setDay(null); setDetail(null); return
      }
      setDay(cur.data)
      const d = await api.get(`/Finance/days/${cur.data.id}`)
      setDetail(d.data)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'تعذر تحميل اليوم')
      setDay(null); setDetail(null)
    } finally {
      setLoading(false)
    }
  }

  const loadLookups = async () => {
    try {
      const c = await api.get('/Finance/categories')
      setCats(c.data || [])
    } catch { /* ignore */ }
    try {
      const p = await api.get('/Finance/partners')
      setPartners(p.data?.partners || [])
    } catch { /* ignore */ }
    try {
      const e = await api.get('/Finance/employees')
      setEmps(e.data || [])
    } catch { /* ignore */ }
  }

  useEffect(() => {
    loadDay()
    loadLookups()
  }, [])

  const closed = day?.status === 'Closed'
  const canEdit = !!day && (!closed || user?.role === 'Owner')
  const selCat = cats.find(c => c.id === form.categoryId)

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
        <Typography variant="h5" fontWeight="bold" gutterBottom>المصروفات</Typography>
        <Alert severity="warning">لا يوجد يوم عمل. من الرئيسية افتح أو أعد فتح يوماً أولاً.</Alert>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => nav('/')}>الرئيسية</Button>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>المصروفات</Typography>
      <Typography sx={{ mb: 1 }}>
        يوم {new Date(day.date).toLocaleDateString('ar-EG')} — {closed ? 'مقفل' : 'مفتوح'} — إجمالي: <b>{day.totalExpense}</b>
      </Typography>
      {closed && <Alert severity="info" sx={{ mb: 1 }}>اليوم مقفل — الإضافة للمالك فقط</Alert>}

      {canEdit && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography fontWeight="bold" gutterBottom>تسجيل مصروف</Typography>
          <Grid container spacing={1}>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth size="small" select label="البند" value={form.categoryId || ''}
                onChange={e => setForm({ ...form, categoryId: +e.target.value, partnerId: '', employeeId: '' })}>
                {cats.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </TextField>
            </Grid>
            {selCat?.code === 'PROFIT_DIST' && (
              <Grid item xs={12} sm={3}>
                <TextField fullWidth size="small" select label="الشريك" value={form.partnerId}
                  onChange={e => setForm({ ...form, partnerId: e.target.value })}>
                  {partners.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </TextField>
              </Grid>
            )}
            {selCat?.code === 'SALARY' && (
              <Grid item xs={12} sm={3}>
                <TextField fullWidth size="small" select label="الموظف" value={form.employeeId}
                  onChange={e => setForm({ ...form, employeeId: e.target.value })}>
                  {emps.filter((e: any) => e.isActive).map((e: any) => (
                    <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
            <Grid item xs={6} sm={2}>
              <TextField fullWidth size="small" type="number" label="المبلغ" value={form.amount}
                onChange={e => setForm({ ...form, amount: +e.target.value })} />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField fullWidth size="small" label="تعليق" value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button fullWidth variant="contained" color="secondary" onClick={async () => {
                if (!form.categoryId) return toast.error('اختر البند')
                if (!form.amount || form.amount <= 0) return toast.error('أدخل مبلغاً صحيحاً')
                try {
                  await api.post(`/Finance/days/${day.id}/expenses`, {
                    categoryId: form.categoryId,
                    amount: form.amount,
                    notes: form.notes || null,
                    partnerId: form.partnerId ? +form.partnerId : null,
                    employeeId: form.employeeId ? +form.employeeId : null
                  })
                  toast.success('تم')
                  setForm({ categoryId: 0, amount: 0, notes: '', partnerId: '', employeeId: '' })
                  loadDay()
                } catch (e: any) {
                  toast.error(e?.response?.data?.message || 'فشل')
                }
              }}>حفظ</Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Table size="small" component={Paper}>
        <TableHead>
          <TableRow>
            <TableCell>البند</TableCell>
            <TableCell>المبلغ</TableCell>
            <TableCell>ربط</TableCell>
            <TableCell>تعليق</TableCell>
            <TableCell>بواسطة</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(detail?.expenses || []).map((x: any) => (
            <TableRow key={x.id}>
              <TableCell>{x.categoryName}</TableCell>
              <TableCell>{x.amount}</TableCell>
              <TableCell>{x.partnerName || x.employeeName || '—'}</TableCell>
              <TableCell>{x.notes || '—'}</TableCell>
              <TableCell>{x.createdByName}</TableCell>
              <TableCell>
                {canEdit && (
                  <Button size="small" color="error" onClick={async () => {
                    if (!confirm('حذف؟')) return
                    await api.delete(`/Finance/expenses/${x.id}`)
                    loadDay()
                  }}>حذف</Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {!(detail?.expenses?.length) && (
            <TableRow><TableCell colSpan={6}>لا توجد مصروفات</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  )
}

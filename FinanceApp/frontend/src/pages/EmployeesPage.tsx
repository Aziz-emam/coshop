import { useEffect, useState } from 'react'
import {
  Box, Typography, Paper, Button, TextField, Grid, Table, TableHead, TableRow, TableCell, TableBody, Switch, FormControlLabel
} from '@mui/material'
import api from '../api/client'
import { toast } from 'react-toastify'
import { useAuth } from '../features/auth'

export default function EmployeesPage() {
  const { user } = useAuth()
  const [list, setList] = useState<any[]>([])
  const [form, setForm] = useState({ name: '', jobTitle: '', baseSalary: 0, hireDate: '', notes: '' })

  const load = () => api.get('/Finance/employees').then(r => setList(r.data)).catch(() => toast.error('تعذر التحميل'))
  useEffect(() => { load() }, [])

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>الموظفون</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        «نشط» = الموظف مستمر ويمكن اختياره عند صرف الراتب. «موقوف» = لا يظهر في قائمة صرف الراتب.
        صرف الراتب من صفحة المصروفات → بند «رواتب».
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={3}><TextField fullWidth size="small" label="الاسم" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Grid>
          <Grid item xs={12} sm={2}><TextField fullWidth size="small" label="الوظيفة" value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} /></Grid>
          <Grid item xs={6} sm={2}><TextField fullWidth size="small" type="number" label="راتب أساسي" value={form.baseSalary} onChange={e => setForm({ ...form, baseSalary: +e.target.value })} /></Grid>
          <Grid item xs={6} sm={2}><TextField fullWidth size="small" type="date" label="تاريخ بدء العمل" InputLabelProps={{ shrink: true }} value={form.hireDate} onChange={e => setForm({ ...form, hireDate: e.target.value })} /></Grid>
          <Grid item xs={12} sm={2}><TextField fullWidth size="small" label="ملاحظة" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Grid>
          <Grid item xs={12} sm={1}>
            <Button fullWidth variant="contained" onClick={async () => {
              try {
                await api.post('/Finance/employees', {
                  name: form.name,
                  jobTitle: form.jobTitle || null,
                  baseSalary: form.baseSalary,
                  hireDate: form.hireDate || null,
                  notes: form.notes || null
                })
                toast.success('تم'); setForm({ name: '', jobTitle: '', baseSalary: 0, hireDate: '', notes: '' }); load()
              } catch (e: any) { toast.error(e?.response?.data?.message || 'فشل') }
            }}>إضافة</Button>
          </Grid>
        </Grid>
      </Paper>

      <Table size="small" component={Paper}>
        <TableHead>
          <TableRow>
            <TableCell>الاسم</TableCell>
            <TableCell>الوظيفة</TableCell>
            <TableCell>الراتب</TableCell>
            <TableCell>بدء العمل</TableCell>
            <TableCell>الحالة</TableCell>
            {user?.role === 'Owner' && <TableCell>إدارة</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {list.map(e => (
            <TableRow key={e.id}>
              <TableCell>{e.name}</TableCell>
              <TableCell>{e.jobTitle || '—'}</TableCell>
              <TableCell>{e.baseSalary}</TableCell>
              <TableCell>{e.hireDate ? new Date(e.hireDate).toLocaleDateString('ar-EG') : '—'}</TableCell>
              <TableCell>{e.isActive ? 'نشط' : 'موقوف'}</TableCell>
              {user?.role === 'Owner' && (
                <TableCell>
                  <Button size="small" onClick={async () => {
                    await api.put(`/Finance/employees/${e.id}`, {
                      name: e.name, jobTitle: e.jobTitle, baseSalary: e.baseSalary,
                      hireDate: e.hireDate, isActive: !e.isActive, notes: e.notes
                    })
                    load()
                  }}>{e.isActive ? 'إيقاف' : 'تفعيل'}</Button>
                  <Button size="small" color="error" onClick={async () => {
                    if (!confirm('حذف الموظف؟')) return
                    await api.delete(`/Finance/employees/${e.id}`)
                    toast.success('تم'); load()
                  }}>حذف</Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}

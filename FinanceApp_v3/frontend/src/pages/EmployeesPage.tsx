import { useEffect, useState } from 'react'
import {
  Box, Typography, Paper, Button, TextField, Grid, Table, TableHead, TableRow, TableCell, TableBody,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import api from '../api/client'
import { toast } from 'react-toastify'
import { useAuth } from '../features/auth'

export default function EmployeesPage() {
  const { user } = useAuth()
  const [list, setList] = useState<any[]>([])
  const [form, setForm] = useState({ name: '', jobTitle: '', baseSalary: 0, hireDate: '', notes: '' })
  const [salaries, setSalaries] = useState<Record<number, any[]>>({})
  const [loadingSal, setLoadingSal] = useState<number | null>(null)

  const load = () => api.get('/Finance/employees').then(r => setList(r.data)).catch(() => toast.error('تعذر التحميل'))
  useEffect(() => { load() }, [])

  const loadSalaries = async (id: number) => {
    if (salaries[id]) return
    setLoadingSal(id)
    try {
      const r = await api.get(`/Finance/employees/${id}/salaries`)
      setSalaries(prev => ({ ...prev, [id]: r.data || [] }))
    } catch {
      setSalaries(prev => ({ ...prev, [id]: [] }))
      toast.error('تعذر تحميل سجل الرواتب')
    } finally {
      setLoadingSal(null)
    }
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>الموظفون</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        نشط = يظهر عند صرف الراتب من المصروفات. سجل الرواتب = دفعات بند «رواتب» المرتبطة بالموظف.
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth size="small" label="الاسم" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} />
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField fullWidth size="small" label="الوظيفة" value={form.jobTitle}
              onChange={e => setForm({ ...form, jobTitle: e.target.value })} />
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField fullWidth size="small" type="number" label="راتب أساسي" value={form.baseSalary}
              onChange={e => setForm({ ...form, baseSalary: +e.target.value })} />
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField fullWidth size="small" type="date" label="بدء العمل" InputLabelProps={{ shrink: true }}
              value={form.hireDate} onChange={e => setForm({ ...form, hireDate: e.target.value })} />
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField fullWidth size="small" label="ملاحظة" value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={1}>
            <Button fullWidth variant="contained" onClick={async () => {
              try {
                await api.post('/Finance/employees', {
                  ...form,
                  jobTitle: form.jobTitle || null,
                  hireDate: form.hireDate || null,
                  notes: form.notes || null
                })
                toast.success('تم')
                setForm({ name: '', jobTitle: '', baseSalary: 0, hireDate: '', notes: '' })
                load()
              } catch (e: any) {
                toast.error(e?.response?.data?.message || 'فشل')
              }
            }}>إضافة</Button>
          </Grid>
        </Grid>
      </Paper>

      {list.map(e => (
        <Accordion key={e.id} onChange={(_, expanded) => { if (expanded) loadSalaries(e.id) }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight="bold" sx={{ flex: 1 }}>{e.name}</Typography>
            <Typography sx={{ mx: 2 }} color="text.secondary">{e.jobTitle || '—'}</Typography>
            <Typography sx={{ mx: 1 }}>{e.baseSalary}</Typography>
            <Typography color={e.isActive ? 'success.main' : 'text.secondary'}>
              {e.isActive ? 'نشط' : 'موقوف'}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={1} sx={{ mb: 1 }}>
              <Grid item xs={12} sm={4}>
                بدء العمل: <b>{e.hireDate ? new Date(e.hireDate).toLocaleDateString('ar-EG') : '—'}</b>
              </Grid>
              <Grid item xs={12} sm={4}>{e.notes || ''}</Grid>
              {user?.role === 'Owner' && (
                <Grid item xs={12} sm={4}>
                  <Button size="small" onClick={async () => {
                    await api.put(`/Finance/employees/${e.id}`, {
                      name: e.name,
                      jobTitle: e.jobTitle,
                      baseSalary: e.baseSalary,
                      hireDate: e.hireDate,
                      isActive: !e.isActive,
                      notes: e.notes
                    })
                    load()
                  }}>{e.isActive ? 'إيقاف' : 'تفعيل'}</Button>
                  <Button size="small" color="error" onClick={async () => {
                    if (!confirm('حذف الموظف؟')) return
                    await api.delete(`/Finance/employees/${e.id}`)
                    toast.success('تم')
                    load()
                  }}>حذف</Button>
                </Grid>
              )}
            </Grid>

            <Typography fontWeight="bold" sx={{ mt: 1, mb: 1 }}>سجل الرواتب</Typography>
            {loadingSal === e.id && <Typography variant="body2">جاري التحميل…</Typography>}
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>المبلغ المدفوع</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(salaries[e.id] || []).map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell>{new Date(s.operationDate).toLocaleDateString('ar-EG')}</TableCell>
                    <TableCell>{Number(s.amount).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {salaries[e.id] && salaries[e.id].length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2}>لا توجد دفعات راتب بعد</TableCell>
                  </TableRow>
                )}
                {salaries[e.id] && salaries[e.id].length > 0 && (
                  <TableRow>
                    <TableCell><b>الإجمالي</b></TableCell>
                    <TableCell>
                      <b>{salaries[e.id].reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0).toFixed(2)}</b>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </AccordionDetails>
        </Accordion>
      ))}

      {!list.length && <Typography color="text.secondary">لا يوجد موظفون بعد</Typography>}
    </Box>
  )
}
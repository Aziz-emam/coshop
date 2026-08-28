import { useEffect, useState } from 'react'
import {
  Box, Typography, Paper, Button, TextField, MenuItem, Grid, Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material'
import api from '../api/client'
import { toast } from 'react-toastify'
import { useAuth } from '../features/auth'

const today = () => new Date().toISOString().slice(0, 10)

export default function ExpensesPage() {
  const { user } = useAuth()
  const [list, setList] = useState<any[]>([])
  const [cats, setCats] = useState<any[]>([])
  const [partners, setPartners] = useState<any[]>([])
  const [emps, setEmps] = useState<any[]>([])
  const [form, setForm] = useState({ operationDate: today(), categoryId: 0, amount: 0, notes: '', partnerId: '', employeeId: '' })
  const [edit, setEdit] = useState<any>(null)
  const [editNote, setEditNote] = useState('')

    const load = async () => {
    try {
      const a = await api.get('/Finance/expenses')
      setList(a.data || [])
    } catch {
      toast.error('تعذر تحميل قائمة المصروفات')
    }
    try {
      const b = await api.get('/Finance/categories')
      setCats((b.data || []).filter((c: any) => c.code !== 'PROFIT_DIST'))
    } catch {
      toast.error('تعذر تحميل البنود')
    }
    try {
      const c = await api.get('/Finance/partners')
      setPartners(c.data?.partners || [])
    } catch {
      setPartners([])
    }
    try {
      const d = await api.get('/Finance/employees')
      setEmps(d.data || [])
    } catch {
      setEmps([])
    }
  }
  useEffect(() => { load() }, [])

  const sel = cats.find(c => c.id === form.categoryId)
  const selEdit = edit ? cats.find(c => c.id === edit.categoryId) : null

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>المصروفات</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={1}>
          <Grid item xs={6} sm={2}>
            <TextField fullWidth size="small" type="date" label="تاريخ العملية" InputLabelProps={{ shrink: true }}
              value={form.operationDate} onChange={e => setForm({ ...form, operationDate: e.target.value })} />
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField fullWidth size="small" select label="البند" value={form.categoryId || ''}
              onChange={e => setForm({ ...form, categoryId: +e.target.value, partnerId: '', employeeId: '' })}>
              {cats.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
          </Grid>
          {sel?.code === 'PROFIT_DIST' && (
            <Grid item xs={6} sm={2}>
              <TextField fullWidth size="small" select label="الشريك" value={form.partnerId}
                onChange={e => setForm({ ...form, partnerId: e.target.value })}>
                {partners.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </TextField>
            </Grid>
          )}
          {sel?.code === 'SALARY' && (
            <Grid item xs={6} sm={2}>
              <TextField fullWidth size="small" select label="الموظف" value={form.employeeId}
                onChange={e => setForm({ ...form, employeeId: e.target.value })}>
                {emps.filter((e: any) => e.isActive).map((e: any) => <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>)}
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
              if (!form.amount || form.amount <= 0) return toast.error('أدخل مبلغاً')
              try {
                await api.post('/Finance/expenses', {
                  operationDate: form.operationDate, categoryId: form.categoryId, amount: form.amount,
                  notes: form.notes || null, partnerId: form.partnerId ? +form.partnerId : null,
                  employeeId: form.employeeId ? +form.employeeId : null
                })
                toast.success('تم'); setForm({ operationDate: today(), categoryId: 0, amount: 0, notes: '', partnerId: '', employeeId: '' }); load()
              } catch (e: any) { toast.error(e?.response?.data?.message || 'فشل') }
            }}>حفظ</Button>
          </Grid>
        </Grid>
      </Paper>

      <Table size="small" component={Paper}>
        <TableHead>
          <TableRow>
            <TableCell>تاريخ العملية</TableCell>
            <TableCell>وقت التسجيل</TableCell>
            <TableCell>البند</TableCell>
            <TableCell>المبلغ</TableCell>
            <TableCell>ربط</TableCell>
            <TableCell>تعليق</TableCell>
            <TableCell>بواسطة</TableCell>
            {user?.role === 'Owner' && <TableCell></TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {list.map(x => (
            <TableRow key={x.id}>
              <TableCell>{new Date(x.operationDate).toLocaleDateString('ar-EG')}</TableCell>
              <TableCell>{new Date(x.createdAt).toLocaleString('ar-EG')}</TableCell>
              <TableCell>{x.categoryName}</TableCell>
              <TableCell>{x.amount}</TableCell>
              <TableCell>{x.partnerName || x.employeeName || '—'}</TableCell>
              <TableCell>{x.notes || '—'}</TableCell>
              <TableCell>{x.createdByName}</TableCell>
              {user?.role === 'Owner' && (
                <TableCell>
                  <Button size="small" onClick={() => {
                    setEdit({
                      ...x, operationDate: String(x.operationDate).slice(0, 10),
                      partnerId: x.partnerId || '', employeeId: x.employeeId || ''
                    }); setEditNote('')
                  }}>تعديل</Button>
                  <Button size="small" color="error" onClick={async () => {
                    const note = prompt('ملاحظة الحذف (إلزامي):')
                    if (!note?.trim()) return
                    try { await api.delete(`/Finance/expenses/${x.id}`, { data: { editNote: note } }); toast.success('تم'); load() }
                    catch (e: any) { toast.error(e?.response?.data?.message || 'فشل') }
                  }}>حذف</Button>
                </TableCell>
              )}
            </TableRow>
          ))}
          {!list.length && <TableRow><TableCell colSpan={8}>لا توجد مصروفات</TableCell></TableRow>}
        </TableBody>
      </Table>

      <Dialog open={!!edit} onClose={() => setEdit(null)} fullWidth maxWidth="sm">
        <DialogTitle>تعديل مصروف (مالك)</DialogTitle>
        <DialogContent>
          {edit && (
            <Grid container spacing={1} sx={{ mt: 0.5 }}>
              <Grid item xs={6}><TextField fullWidth size="small" type="date" label="تاريخ" InputLabelProps={{ shrink: true }} value={edit.operationDate} onChange={e => setEdit({ ...edit, operationDate: e.target.value })} /></Grid>
              <Grid item xs={6}><TextField fullWidth size="small" select label="البند" value={edit.categoryId}
                onChange={e => setEdit({ ...edit, categoryId: +e.target.value, partnerId: '', employeeId: '' })}>
                {cats.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </TextField></Grid>
              {selEdit?.code === 'PROFIT_DIST' && (
                <Grid item xs={6}><TextField fullWidth size="small" select label="الشريك" value={edit.partnerId || ''}
                  onChange={e => setEdit({ ...edit, partnerId: e.target.value })}>
                  {partners.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </TextField></Grid>
              )}
              {selEdit?.code === 'SALARY' && (
                <Grid item xs={6}><TextField fullWidth size="small" select label="الموظف" value={edit.employeeId || ''}
                  onChange={e => setEdit({ ...edit, employeeId: e.target.value })}>
                  {emps.map((e: any) => <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>)}
                </TextField></Grid>
              )}
              <Grid item xs={6}><TextField fullWidth size="small" type="number" label="المبلغ" value={edit.amount} onChange={e => setEdit({ ...edit, amount: +e.target.value })} /></Grid>
              <Grid item xs={6}><TextField fullWidth size="small" label="تعليق" value={edit.notes || ''} onChange={e => setEdit({ ...edit, notes: e.target.value })} /></Grid>
              <Grid item xs={12}><TextField fullWidth size="small" required label="ملاحظة التعديل" value={editNote} onChange={e => setEditNote(e.target.value)} /></Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdit(null)}>إلغاء</Button>
          <Button variant="contained" onClick={async () => {
            if (!editNote.trim()) return toast.error('ملاحظة التعديل مطلوبة')
            try {
              await api.put(`/Finance/expenses/${edit.id}`, {
                operationDate: edit.operationDate, categoryId: edit.categoryId, amount: edit.amount,
                notes: edit.notes, partnerId: edit.partnerId ? +edit.partnerId : null,
                employeeId: edit.employeeId ? +edit.employeeId : null, editNote
              })
              toast.success('تم'); setEdit(null); load()
            } catch (e: any) { toast.error(e?.response?.data?.message || 'فشل') }
          }}>حفظ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

import { useEffect, useState } from 'react'
import {
  Box, Typography, Paper, Button, TextField, MenuItem, Grid, Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material'
import api from '../api/client'
import { toast } from 'react-toastify'
import { useAuth } from '../features/auth'

const srcLabel = (s: string) => s === 'KidsArea' ? 'كيدز اريا' : s === 'CoffeeShop' ? 'كوفي شوب' : 'أخرى'
const today = () => new Date().toISOString().slice(0, 10)

export default function IncomesPage() {
  const { user } = useAuth()
  const [list, setList] = useState<any[]>([])
  const [form, setForm] = useState({ operationDate: today(), source: 1, amount: 0, notes: '' })
  const [edit, setEdit] = useState<any>(null)
  const [editNote, setEditNote] = useState('')

  const load = () => api.get('/Finance/incomes').then(r => setList(r.data)).catch(() => toast.error('تعذر التحميل'))
  useEffect(() => { load() }, [])

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>الواردات</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={1}>
          <Grid item xs={6} sm={2}>
            <TextField fullWidth size="small" type="date" label="تاريخ العملية" InputLabelProps={{ shrink: true }}
              value={form.operationDate} onChange={e => setForm({ ...form, operationDate: e.target.value })} />
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField fullWidth size="small" select label="المصدر" value={form.source}
              onChange={e => setForm({ ...form, source: +e.target.value })}>
              <MenuItem value={1}>كيدز اريا</MenuItem>
              <MenuItem value={2}>كوفي شوب</MenuItem>
              <MenuItem value={3}>أخرى</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField fullWidth size="small" type="number" label="المبلغ" value={form.amount}
              onChange={e => setForm({ ...form, amount: +e.target.value })} />
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextField fullWidth size="small" label="تعليق / توضيح المصدر" value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button fullWidth variant="contained" onClick={async () => {
              if (!form.amount || form.amount <= 0) return toast.error('أدخل مبلغاً')
              try {
                await api.post('/Finance/incomes', form)
                toast.success('تم'); setForm({ operationDate: today(), source: 1, amount: 0, notes: '' }); load()
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
            <TableCell>المصدر</TableCell>
            <TableCell>المبلغ</TableCell>
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
              <TableCell>{srcLabel(x.source)}</TableCell>
              <TableCell>{x.amount}</TableCell>
              <TableCell>{x.notes || '—'}</TableCell>
              <TableCell>{x.createdByName}</TableCell>
              {user?.role === 'Owner' && (
                <TableCell>
                  <Button size="small" onClick={() => { setEdit({ ...x, source: x.source === 'KidsArea' ? 1 : x.source === 'CoffeeShop' ? 2 : 3, operationDate: x.operationDate.slice(0, 10) }); setEditNote('') }}>تعديل</Button>
                  <Button size="small" color="error" onClick={async () => {
                    const note = prompt('ملاحظة الحذف (إلزامي):')
                    if (!note?.trim()) return
                    try { await api.delete(`/Finance/incomes/${x.id}`, { data: { editNote: note } }); toast.success('تم'); load() }
                    catch (e: any) { toast.error(e?.response?.data?.message || 'فشل') }
                  }}>حذف</Button>
                </TableCell>
              )}
            </TableRow>
          ))}
          {!list.length && <TableRow><TableCell colSpan={7}>لا توجد واردات</TableCell></TableRow>}
        </TableBody>
      </Table>

      <Dialog open={!!edit} onClose={() => setEdit(null)} fullWidth maxWidth="sm">
        <DialogTitle>تعديل وارد (مالك)</DialogTitle>
        <DialogContent>
          {edit && (
            <Grid container spacing={1} sx={{ mt: 0.5 }}>
              <Grid item xs={6}><TextField fullWidth size="small" type="date" label="تاريخ العملية" InputLabelProps={{ shrink: true }} value={edit.operationDate} onChange={e => setEdit({ ...edit, operationDate: e.target.value })} /></Grid>
              <Grid item xs={6}><TextField fullWidth size="small" select label="المصدر" value={edit.source} onChange={e => setEdit({ ...edit, source: +e.target.value })}>
                <MenuItem value={1}>كيدز</MenuItem><MenuItem value={2}>كوفي</MenuItem><MenuItem value={3}>أخرى</MenuItem>
              </TextField></Grid>
              <Grid item xs={6}><TextField fullWidth size="small" type="number" label="المبلغ" value={edit.amount} onChange={e => setEdit({ ...edit, amount: +e.target.value })} /></Grid>
              <Grid item xs={6}><TextField fullWidth size="small" label="تعليق" value={edit.notes || ''} onChange={e => setEdit({ ...edit, notes: e.target.value })} /></Grid>
              <Grid item xs={12}><TextField fullWidth size="small" required label="ملاحظة التعديل (تُحفظ في السجل)" value={editNote} onChange={e => setEditNote(e.target.value)} /></Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdit(null)}>إلغاء</Button>
          <Button variant="contained" onClick={async () => {
            if (!editNote.trim()) return toast.error('ملاحظة التعديل مطلوبة')
            try {
              await api.put(`/Finance/incomes/${edit.id}`, { operationDate: edit.operationDate, source: edit.source, amount: edit.amount, notes: edit.notes, editNote })
              toast.success('تم'); setEdit(null); load()
            } catch (e: any) { toast.error(e?.response?.data?.message || 'فشل') }
          }}>حفظ التعديل</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

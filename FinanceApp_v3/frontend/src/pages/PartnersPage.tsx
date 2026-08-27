import { useEffect, useState } from 'react'
import {
  Box, Typography, Paper, Button, TextField, Grid, Alert, Table, TableHead, TableRow, TableCell, TableBody, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import api from '../api/client'
import { toast } from 'react-toastify'
import { useAuth } from '../features/auth'

export default function PartnersPage() {
  const { user } = useAuth()
  const [title, setTitle] = useState('الشركاء')
  const [list, setList] = useState<any[]>([])
  const [totalPct, setTotalPct] = useState(0)
  const [remPct, setRemPct] = useState(0)
  const [warn, setWarn] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', sharePercent: 0, notes: '' })
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [calc, setCalc] = useState<any>(null)
  const [exps, setExps] = useState<Record<number, any[]>>({})

  const load = async () => {
    try {
      const [s, p] = await Promise.all([api.get('/Finance/settings'), api.get('/Finance/partners')])
      setTitle(s.data.partnersPageTitle || 'الشركاء')
      setList(p.data.partners || [])
      setTotalPct(p.data.totalPercent ?? 0)
      setRemPct(p.data.remainingPercent ?? 0)
      setWarn(!!p.data.warning)
    } catch { toast.error('تعذر تحميل الشركاء') }
  }
  useEffect(() => { load() }, [])

  const loadExp = async (id: number) => {
    if (exps[id]) return
    try {
      const r = await api.get(`/Finance/partners/${id}/expenses`)
      setExps(prev => ({ ...prev, [id]: r.data || [] }))
    } catch { setExps(prev => ({ ...prev, [id]: [] })) }
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>{title}</Typography>
      {warn && <Alert severity="warning" sx={{ mb: 2 }}>مجموع النسب = {totalPct}% — المتبقي {remPct}% (لا يمنع الحفظ)</Alert>}
      {!warn && list.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>مجموع النسب: {totalPct}%</Typography>
      )}

      {user?.role === 'Owner' && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography fontWeight="bold" gutterBottom>إضافة شريك</Typography>
          <Grid container spacing={1}>
            <Grid item xs={12} sm={3}><TextField fullWidth size="small" label="الاسم" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Grid>
            <Grid item xs={6} sm={2}><TextField fullWidth size="small" label="الكود" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} helperText="بالإنجليزي فريد" /></Grid>
            <Grid item xs={6} sm={2}><TextField fullWidth size="small" type="number" label="نسبة %" value={form.sharePercent} onChange={e => setForm({ ...form, sharePercent: +e.target.value })} /></Grid>
            <Grid item xs={12} sm={3}><TextField fullWidth size="small" label="ملاحظات" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Grid>
            <Grid item xs={12} sm={2}>
              <Button fullWidth variant="contained" onClick={async () => {
                if (!form.name.trim() || !form.code.trim()) return toast.error('الاسم والكود مطلوبان')
                try {
                  await api.post('/Finance/partners', form)
                  toast.success('تمت إضافة الشريك')
                  setForm({ name: '', code: '', sharePercent: 0, notes: '' })
                  await load()
                } catch (e: any) { toast.error(e?.response?.data?.message || 'فشل') }
              }}>حفظ</Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {list.length === 0 && <Alert severity="info">لا يوجد شركاء بعد. أضف من النموذج أعلاه (مالك).</Alert>}

      {list.map(p => (
        <Accordion key={p.id} onChange={(_, exp) => { if (exp) loadExp(p.id) }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight="bold" sx={{ flex: 1 }}>{p.name}</Typography>
            <Typography sx={{ mx: 2 }}>{p.sharePercent}%</Typography>
            <Typography color="text.secondary">{p.isActive ? 'نشط' : 'موقوف'}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={1} sx={{ mb: 1 }}>
              <Grid item xs={6} sm={3}>الكود: <b>{p.code}</b></Grid>
              <Grid item xs={6} sm={3}>مدفوع توزيع أرباح (كل الفترات): <b>{p.paidTotal ?? 0}</b></Grid>
              <Grid item xs={12}>{p.notes || '—'}</Grid>
            </Grid>
            {user?.role === 'Owner' && (
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <TextField size="small" type="number" label="نسبة %" defaultValue={p.sharePercent} sx={{ width: 120 }}
                  onBlur={async e => {
                    try {
                      await api.put(`/Finance/partners/${p.id}`, {
                        name: p.name, code: p.code, sharePercent: +e.target.value, isActive: p.isActive, notes: p.notes
                      })
                      toast.success('تم'); load()
                    } catch (err: any) { toast.error(err?.response?.data?.message || 'فشل') }
                  }} />
                <Button size="small" onClick={async () => {
                  await api.put(`/Finance/partners/${p.id}`, {
                    name: p.name, code: p.code, sharePercent: p.sharePercent, isActive: !p.isActive, notes: p.notes
                  })
                  load()
                }}>{p.isActive ? 'إيقاف' : 'تفعيل'}</Button>
                <Button size="small" color="error" onClick={async () => {
                  if (!confirm('حذف الشريك؟')) return
                  await api.delete(`/Finance/partners/${p.id}`); toast.success('تم'); load()
                }}>حذف</Button>
              </Box>
            )}
            <Typography fontWeight="bold" variant="body2">مصروفات مرتبطة</Typography>
            <Table size="small">
              <TableHead><TableRow><TableCell>تاريخ</TableCell><TableCell>بند</TableCell><TableCell>مبلغ</TableCell><TableCell>ملاحظة</TableCell></TableRow></TableHead>
              <TableBody>
                {(exps[p.id] || []).map(x => (
                  <TableRow key={x.id}>
                    <TableCell>{new Date(x.operationDate).toLocaleDateString('ar-EG')}</TableCell>
                    <TableCell>{x.categoryName}</TableCell>
                    <TableCell>{x.amount}</TableCell>
                    <TableCell>{x.notes || '—'}</TableCell>
                  </TableRow>
                ))}
                {exps[p.id] && !exps[p.id].length && <TableRow><TableCell colSpan={4}>لا يوجد</TableCell></TableRow>}
              </TableBody>
            </Table>
          </AccordionDetails>
        </Accordion>
      ))}

      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography fontWeight="bold" gutterBottom>احتساب التوزيع لفترة</Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <TextField type="date" size="small" label="من" InputLabelProps={{ shrink: true }} value={from} onChange={e => setFrom(e.target.value)} />
          <TextField type="date" size="small" label="إلى" InputLabelProps={{ shrink: true }} value={to} onChange={e => setTo(e.target.value)} />
          <Button variant="contained" onClick={async () => {
            if (!from || !to) return toast.error('حدد الفترة')
            const r = await api.post(`/Finance/partners/calculate?from=${from}&to=${to}`)
            setCalc(r.data)
          }}>احتساب</Button>
        </Box>
        {calc && (
          <>
            {calc.percentWarning && <Alert severity="warning" sx={{ mb: 1 }}>نسب {calc.totalPercent}% — متبقي {calc.remainingPercent}%</Alert>}
            <Typography sx={{ mb: 1 }}>أساس (وارد − مصروف الفترة): <b>{calc.baseNet}</b></Typography>
            <Table size="small">
              <TableHead><TableRow><TableCell>الشريك</TableCell><TableCell>%</TableCell><TableCell>مستحق</TableCell><TableCell>مدفوع</TableCell><TableCell>باقي</TableCell></TableRow></TableHead>
              <TableBody>
                {calc.partners.map((p: any) => (
                  <TableRow key={p.partnerId}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.sharePercent}</TableCell>
                    <TableCell>{p.entitled}</TableCell>
                    <TableCell>{p.paid}</TableCell>
                    <TableCell>{p.remaining}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </Paper>
    </Box>
  )
}

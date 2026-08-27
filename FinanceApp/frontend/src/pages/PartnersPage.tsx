import { useEffect, useState } from 'react'
import {
  Box, Typography, Paper, Button, TextField, Grid, Alert, Table, TableHead, TableRow, TableCell, TableBody, Tabs, Tab
} from '@mui/material'
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
  const [tab, setTab] = useState(0)
  const [form, setForm] = useState({ name: '', code: '', sharePercent: 0, notes: '' })
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [calc, setCalc] = useState<any>(null)
  const [partnerExps, setPartnerExps] = useState<any[]>([])

  const load = async () => {
    const [s, p] = await Promise.all([api.get('/Finance/settings'), api.get('/Finance/partners')])
    setTitle(s.data.partnersPageTitle || 'الشركاء')
    const partners = p.data.partners || []
    setList(partners)
    setTotalPct(p.data.totalPercent ?? 0)
    setRemPct(p.data.remainingPercent ?? 0)
    setWarn(!!p.data.warning)
    return partners
  }

  useEffect(() => { load().catch(() => toast.error('تعذر التحميل')) }, [])

  useEffect(() => {
    const p = list[tab]
    if (!p || tab >= list.length) { setPartnerExps([]); return }
    api.get(`/Finance/partners/${p.id}/expenses`).then(r => setPartnerExps(r.data || [])).catch(() => setPartnerExps([]))
  }, [tab, list])

  const addIndex = list.length
  const calcIndex = list.length + (user?.role === 'Owner' ? 1 : 0)

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>{title}</Typography>
      {warn && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          مجموع النسب = {totalPct}% — المتبقي {remPct}% (لا يمنع الحفظ)
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ mb: 2 }}>
        {list.map(p => <Tab key={p.id} label={p.name} />)}
        {user?.role === 'Owner' && <Tab label="+ إضافة" />}
        <Tab label="احتساب التوزيع" />
      </Tabs>

      {list.map((p, i) => tab === i && (
        <Paper key={p.id} sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}><Typography>الكود: <b>{p.code}</b></Typography></Grid>
            <Grid item xs={12} sm={4}><Typography>النسبة: <b>{p.sharePercent}%</b></Typography></Grid>
            <Grid item xs={12} sm={4}><Typography>الحالة: {p.isActive ? 'نشط' : 'موقوف'}</Typography></Grid>
            <Grid item xs={12} sm={4}><Typography>إجمالي المدفوع (توزيع أرباح): <b>{p.paidTotal ?? 0}</b></Typography></Grid>
            <Grid item xs={12}><Typography color="text.secondary">{p.notes || '—'}</Typography></Grid>
          </Grid>
          {user?.role === 'Owner' && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <TextField size="small" type="number" label="تعديل النسبة %" defaultValue={p.sharePercent}
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
                await api.delete(`/Finance/partners/${p.id}`)
                setTab(0); load(); toast.success('تم الحذف')
              }}>حذف</Button>
            </Box>
          )}
          <Typography fontWeight="bold" sx={{ mt: 2 }}>مصروفات مرتبطة بهذا الشريك</Typography>
          <Table size="small">
            <TableHead><TableRow><TableCell>البند</TableCell><TableCell>المبلغ</TableCell><TableCell>ملاحظة</TableCell><TableCell>الوقت</TableCell></TableRow></TableHead>
            <TableBody>
              {partnerExps.map(x => (
                <TableRow key={x.id}>
                  <TableCell>{x.categoryName}</TableCell>
                  <TableCell>{x.amount}</TableCell>
                  <TableCell>{x.notes || '—'}</TableCell>
                  <TableCell>{new Date(x.createdAt).toLocaleString('ar-EG')}</TableCell>
                </TableRow>
              ))}
              {!partnerExps.length && <TableRow><TableCell colSpan={4}>لا يوجد</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Paper>
      ))}

      {user?.role === 'Owner' && tab === addIndex && (
        <Paper sx={{ p: 2 }}>
          <Typography fontWeight="bold" gutterBottom>إضافة شريك</Typography>
          <Grid container spacing={1}>
            <Grid item xs={12} sm={3}><TextField fullWidth size="small" label="الاسم" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Grid>
            <Grid item xs={12} sm={2}><TextField fullWidth size="small" label="الكود" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></Grid>
            <Grid item xs={12} sm={2}><TextField fullWidth size="small" type="number" label="نسبة %" value={form.sharePercent} onChange={e => setForm({ ...form, sharePercent: +e.target.value })} /></Grid>
            <Grid item xs={12} sm={3}><TextField fullWidth size="small" label="ملاحظات" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Grid>
            <Grid item xs={12} sm={2}>
              <Button fullWidth variant="contained" onClick={async () => {
                try {
                  const r = await api.post('/Finance/partners', form)
                  toast.success('تمت الإضافة')
                  setForm({ name: '', code: '', sharePercent: 0, notes: '' })
                  const partners = await load()
                  const idx = partners.findIndex((x: any) => x.id === r.data.id)
                  setTab(idx >= 0 ? idx : 0)
                } catch (e: any) { toast.error(e?.response?.data?.message || 'فشل') }
              }}>حفظ</Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {tab === calcIndex && (
        <Paper sx={{ p: 2 }}>
          <Typography fontWeight="bold" gutterBottom>احتساب التوزيع (وارد − مصروف الفترة) × النسبة</Typography>
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
              {calc.percentWarning && <Alert severity="warning" sx={{ mb: 1 }}>مجموع النسب {calc.totalPercent}% — متبقي {calc.remainingPercent}%</Alert>}
              <Typography sx={{ mb: 1 }}>أساس الاحتساب: <b>{calc.baseNet}</b></Typography>
              <Table size="small">
                <TableHead><TableRow><TableCell>الشريك</TableCell><TableCell>نسبة</TableCell><TableCell>مستحق</TableCell><TableCell>مدفوع</TableCell><TableCell>باقي</TableCell></TableRow></TableHead>
                <TableBody>
                  {calc.partners.map((p: any) => (
                    <TableRow key={p.partnerId}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>{p.sharePercent}%</TableCell>
                      <TableCell>{p.entitled}</TableCell>
                      <TableCell>{p.paid}</TableCell>
                      <TableCell>{p.remaining}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button sx={{ mt: 1 }} onClick={() => {
                const lines = ['الشريك,النسبة,مستحق,مدفوع,باقي', ...calc.partners.map((p: any) => `${p.name},${p.sharePercent},${p.entitled},${p.paid},${p.remaining}`)]
                const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'partners.csv'; a.click()
              }}>تصدير CSV</Button>
            </>
          )}
        </Paper>
      )}
    </Box>
  )
}

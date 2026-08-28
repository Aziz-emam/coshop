import { useEffect, useState } from 'react'
import {
  Box, Typography, Paper, Button, TextField, Grid, Alert, Table, TableHead, TableRow, TableCell, TableBody,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import api from '../api/client'
import { toast } from 'react-toastify'
import { useAuth } from '../features/auth'

const today = () => new Date().toISOString().slice(0, 10)

export default function PartnersPage() {
  const { user } = useAuth()
  const [title, setTitle] = useState('الشركاء')
  const [list, setList] = useState<any[]>([])
  const [totalPct, setTotalPct] = useState(0)
  const [remPct, setRemPct] = useState(0)
  const [warn, setWarn] = useState(false)
  const [net, setNet] = useState(0)
  const [form, setForm] = useState({ name: '', code: '', sharePercent: 0, notes: '' })
  const [exps, setExps] = useState<Record<number, any[]>>({})
  const [pay, setPay] = useState<Record<number, { operationDate: string; amount: number; notes: string }>>({})

  const load = async () => {
    try {
      const [s, p, d] = await Promise.all([
        api.get('/Finance/settings'),
        api.get('/Finance/partners'),
        api.get('/Finance/dashboard')
      ])
      setTitle(s.data.partnersPageTitle || 'الشركاء')
      setList(p.data.partners || [])
      setTotalPct(p.data.totalPercent ?? 0)
      setRemPct(p.data.remainingPercent ?? 0)
      setWarn(!!p.data.warning)
      setNet(Number(d.data?.net || 0))
    } catch {
      toast.error('تعذر تحميل الشركاء')
    }
  }
  useEffect(() => { load() }, [])

  const totalDistPaid = list.reduce((s, p) => s + Number(p.paidTotal || 0), 0)
  const afterDist = net - totalDistPaid

  const loadExp = async (id: number) => {
    try {
      const r = await api.get(`/Finance/partners/${id}/expenses`)
      setExps(prev => ({ ...prev, [id]: r.data || [] }))
    } catch {
      setExps(prev => ({ ...prev, [id]: [] }))
    }
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>{title}</Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd' }}>
            <Typography color="text.secondary" variant="body2">صافي الأرباح (كما الرئيسية)</Typography>
            <Typography variant="h5" fontWeight="bold">{net.toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0' }}>
            <Typography color="text.secondary" variant="body2">إجمالي توزيع الأرباح المدفوع</Typography>
            <Typography variant="h5" fontWeight="bold">{totalDistPaid.toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e9' }}>
            <Typography color="text.secondary" variant="body2">الحالي بعد التوزيع</Typography>
            <Typography variant="h5" fontWeight="bold">{afterDist.toFixed(2)}</Typography>
            <Typography variant="caption">صافي − إجمالي التوزيع</Typography>
          </Paper>
        </Grid>
      </Grid>

      {warn && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          مجموع النسب = {totalPct}% — المتبقي {remPct}% (لا يمنع الحفظ)
        </Alert>
      )}

      {user?.role === 'Owner' && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography fontWeight="bold" gutterBottom>إضافة شريك</Typography>
          <Grid container spacing={1}>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth size="small" label="الاسم" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField fullWidth size="small" label="الكود" value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value })} helperText="إنجليزي فريد" />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField fullWidth size="small" type="number" label="نسبة %" value={form.sharePercent}
                onChange={e => setForm({ ...form, sharePercent: +e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth size="small" label="ملاحظات" value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button fullWidth variant="contained" onClick={async () => {
                if (!form.name.trim() || !form.code.trim()) return toast.error('الاسم والكود مطلوبان')
                try {
                  await api.post('/Finance/partners', form)
                  toast.success('تمت الإضافة')
                  setForm({ name: '', code: '', sharePercent: 0, notes: '' })
                  load()
                } catch (e: any) {
                  toast.error(e?.response?.data?.message || 'فشل')
                }
              }}>حفظ</Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {list.length === 0 && <Alert severity="info">لا يوجد شركاء بعد.</Alert>}

      {list.map(p => {
        const entitled = Number(p.entitledTotal ?? (net * Number(p.sharePercent) / 100))
        const paid = Number(p.paidTotal || 0)
        const remaining = entitled - paid
        const pf = pay[p.id] || { operationDate: today(), amount: 0, notes: '' }
        return (
          <Accordion key={p.id} onChange={(_, expanded) => { if (expanded) loadExp(p.id) }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight="bold" sx={{ flex: 1 }}>{p.name}</Typography>
              <Typography sx={{ mx: 2 }}>{p.sharePercent}%</Typography>
              <Typography color="text.secondary">{p.isActive ? 'نشط' : 'موقوف'}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                <Grid item xs={6} sm={3}>الكود: <b>{p.code}</b></Grid>
                <Grid item xs={6} sm={3}>المستحق (من صافي الأرباح): <b>{entitled.toFixed(2)}</b></Grid>
                <Grid item xs={6} sm={3}>مدفوع توزيع أرباح: <b>{paid.toFixed(2)}</b></Grid>
                <Grid item xs={6} sm={3}>باقي المستحقات: <b>{remaining.toFixed(2)}</b></Grid>
                <Grid item xs={12}>{p.notes || '—'}</Grid>
              </Grid>

              {user?.role === 'Owner' && (
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <TextField size="small" type="number" label="نسبة %" defaultValue={p.sharePercent} sx={{ width: 120 }}
                    onBlur={async e => {
                      try {
                        await api.put(`/Finance/partners/${p.id}`, {
                          name: p.name, code: p.code, sharePercent: +e.target.value,
                          isActive: p.isActive, notes: p.notes
                        })
                        toast.success('تم')
                        load()
                      } catch (err: any) {
                        toast.error(err?.response?.data?.message || 'فشل')
                      }
                    }} />
                  <Button size="small" onClick={async () => {
                    await api.put(`/Finance/partners/${p.id}`, {
                      name: p.name, code: p.code, sharePercent: p.sharePercent,
                      isActive: !p.isActive, notes: p.notes
                    })
                    load()
                  }}>{p.isActive ? 'إيقاف' : 'تفعيل'}</Button>
                  <Button size="small" color="error" onClick={async () => {
                    if (!confirm('حذف الشريك؟')) return
                    await api.delete(`/Finance/partners/${p.id}`)
                    toast.success('تم')
                    load()
                  }}>حذف</Button>
                </Box>
              )}

              <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
                <Typography fontWeight="bold" gutterBottom>تسجيل دفعة توزيع أرباح</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6} sm={3}>
                    <TextField fullWidth size="small" type="date" label="التاريخ" InputLabelProps={{ shrink: true }}
                      value={pf.operationDate}
                      onChange={e => setPay(prev => ({ ...prev, [p.id]: { ...pf, operationDate: e.target.value } }))} />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField fullWidth size="small" type="number" label="المبلغ"
                      value={pf.amount}
                      onChange={e => setPay(prev => ({ ...prev, [p.id]: { ...pf, amount: +e.target.value } }))} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth size="small" label="ملاحظة"
                      value={pf.notes}
                      onChange={e => setPay(prev => ({ ...prev, [p.id]: { ...pf, notes: e.target.value } }))} />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Button fullWidth variant="contained" color="secondary" onClick={async () => {
                      if (!pf.amount || pf.amount <= 0) return toast.error('أدخل مبلغاً')
                      try {
                        await api.post(`/Finance/partners/${p.id}/distribution`, {
                          operationDate: pf.operationDate,
                          amount: pf.amount,
                          notes: pf.notes || null
                        })
                        toast.success('تم تسجيل التوزيع')
                        setPay(prev => ({ ...prev, [p.id]: { operationDate: today(), amount: 0, notes: '' } }))
                        setExps(prev => {
                          const n = { ...prev }
                          delete n[p.id]
                          return n
                        })
                        await load()
                        await loadExp(p.id)
                      } catch (e: any) {
                        toast.error(e?.response?.data?.message || 'فشل')
                      }
                    }}>صرف</Button>
                  </Grid>
                </Grid>
              </Paper>

              <Typography fontWeight="bold" variant="body2">سجل توزيع الأرباح</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>التاريخ</TableCell>
                    <TableCell>المبلغ</TableCell>
                    <TableCell>ملاحظة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(exps[p.id] || []).map(x => (
                    <TableRow key={x.id}>
                      <TableCell>{new Date(x.operationDate).toLocaleDateString('ar-EG')}</TableCell>
                      <TableCell>{x.amount}</TableCell>
                      <TableCell>{x.notes || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {exps[p.id] && !exps[p.id].length && (
                    <TableRow><TableCell colSpan={3}>لا يوجد</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </AccordionDetails>
          </Accordion>
        )
      })}
    </Box>
  )
}
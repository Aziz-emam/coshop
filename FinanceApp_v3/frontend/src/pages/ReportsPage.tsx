import { useState } from 'react'
import { Box, Typography, Paper, Button, TextField, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material'
import api from '../api/client'
import { toast } from 'react-toastify'
import { useAuth } from '../features/auth'

export default function ReportsPage() {
  const { user } = useAuth()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [period, setPeriod] = useState<any>(null)
  const [salary, setSalary] = useState<any>(null)
  const [audits, setAudits] = useState<any[]>([])

  const run = async () => {
    if (!from || !to) return toast.error('حدد الفترة')
    try {
      const [p, s] = await Promise.all([
        api.get('/Finance/reports/period', { params: { from, to } }),
        api.get('/Finance/reports/salary', { params: { from, to } })
      ])
      setPeriod(p.data); setSalary(s.data)
    } catch { toast.error('فشل التقرير') }
  }

  const print = () => {
    if (!period) return
    const w = window.open('', '_blank'); if (!w) return
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><title>تقرير</title>
<style>body{font-family:Tahoma;padding:16px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #333;padding:6px}</style></head><body>
<h2>تقرير ${from} → ${to}</h2>
<p>واردات: <b>${period.totalIncome}</b> | مصروفات: <b>${period.totalExpense}</b> | صافي: <b>${period.net}</b></p>
<h3>حسب المصدر</h3><table><tr><th>مصدر</th><th>مبلغ</th></tr>
${(period.bySource||[]).map((x:any)=>`<tr><td>${x.source}</td><td>${x.amount}</td></tr>`).join('')}</table>
<h3>حسب البند</h3><table><tr><th>بند</th><th>مبلغ</th></tr>
${(period.byCategory||[]).map((x:any)=>`<tr><td>${x.category}</td><td>${x.amount}</td></tr>`).join('')}</table>
<script>setTimeout(()=>print(),300)<\\/script></body></html>`)
    w.document.close()
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>التقارير</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <TextField type="date" size="small" label="من" InputLabelProps={{ shrink: true }} value={from} onChange={e => setFrom(e.target.value)} />
        <TextField type="date" size="small" label="إلى" InputLabelProps={{ shrink: true }} value={to} onChange={e => setTo(e.target.value)} />
        <Button variant="contained" onClick={run}>عرض</Button>
        {period && <Button onClick={print}>طباعة</Button>}
        {user?.role === 'Owner' && (
          <Button onClick={async () => {
            const r = await api.get('/Finance/audits'); setAudits(r.data)
          }}>سجل التدقيق</Button>
        )}
      </Box>
      {period && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography>واردات: <b>{period.totalIncome}</b> · مصروفات: <b>{period.totalExpense}</b> · صافي: <b>{period.net}</b></Typography>
          <Typography fontWeight="bold" sx={{ mt: 2 }}>حسب المصدر</Typography>
          <Table size="small"><TableBody>
            {(period.bySource || []).map((x: any, i: number) => <TableRow key={i}><TableCell>{x.source}</TableCell><TableCell>{x.amount}</TableCell></TableRow>)}
          </TableBody></Table>
          <Typography fontWeight="bold" sx={{ mt: 2 }}>حسب بند المصروف</Typography>
          <Table size="small"><TableBody>
            {(period.byCategory || []).map((x: any, i: number) => <TableRow key={i}><TableCell>{x.category}</TableCell><TableCell>{x.amount}</TableCell></TableRow>)}
          </TableBody></Table>
        </Paper>
      )}
      {salary && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography fontWeight="bold">تقرير الرواتب — إجمالي {salary.total}</Typography>
          <Table size="small">
            <TableHead><TableRow><TableCell>موظف</TableCell><TableCell>مرات</TableCell><TableCell>المبلغ</TableCell></TableRow></TableHead>
            <TableBody>
              {(salary.employees || []).map((x: any, i: number) => (
                <TableRow key={i}><TableCell>{x.name}</TableCell><TableCell>{x.count}</TableCell><TableCell>{x.total}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
      {audits.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography fontWeight="bold">التدقيق</Typography>
          <Table size="small">
            <TableHead><TableRow><TableCell>وقت</TableCell><TableCell>مستخدم</TableCell><TableCell>إجراء</TableCell><TableCell>ملخص</TableCell><TableCell>ملاحظة</TableCell></TableRow></TableHead>
            <TableBody>
              {audits.map((a, i) => (
                <TableRow key={i}>
                  <TableCell>{new Date(a.createdAt).toLocaleString('ar-EG')}</TableCell>
                  <TableCell>{a.userName}</TableCell>
                  <TableCell>{a.action}</TableCell>
                  <TableCell>{a.summary}</TableCell>
                  <TableCell>{a.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  )
}

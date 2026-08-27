import { useState } from 'react'
import { Box, Typography, Paper, Button, TextField, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material'
import api from '../api/client'
import { toast } from 'react-toastify'

export default function ReportsPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [period, setPeriod] = useState<any>(null)
  const [salary, setSalary] = useState<any>(null)

  const loadPeriod = async () => {
    if (!from || !to) return toast.error('حدد الفترة')
    const r = await api.get('/Finance/reports/period', { params: { from, to } })
    setPeriod(r.data)
  }
  const loadSalary = async () => {
    if (!from || !to) return toast.error('حدد الفترة')
    const r = await api.get('/Finance/reports/salary', { params: { from, to } })
    setSalary(r.data)
  }

  const csv = (name: string, lines: string[]) => {
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click()
  }

  const printPeriod = () => {
    if (!period) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><title>تقرير فترة</title>
<style>body{font-family:Tahoma;padding:16px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #333;padding:5px}</style></head><body>
<h2 style="text-align:center">تقرير فترة</h2>
<p>من ${period.from} إلى ${period.to} — عدد الأيام: ${period.daysCount}</p>
<p>افتتاحي أول يوم: <b>${period.openingFirst}</b></p>
<p>إجمالي واردات: <b>${period.totalIncome}</b> | مصروفات: <b>${period.totalExpense}</b> | صافي آخر يوم: <b>${period.lastNet}</b></p>
<h3>حسب المصدر</h3><table><tr><th>مصدر</th><th>مبلغ</th></tr>${(period.bySource||[]).map((x:any)=>`<tr><td>${x.source}</td><td>${x.amount}</td></tr>`).join('')}</table>
<h3>حسب البند</h3><table><tr><th>بند</th><th>مبلغ</th></tr>${(period.byCategory||[]).map((x:any)=>`<tr><td>${x.category}</td><td>${x.amount}</td></tr>`).join('')}</table>
<script>setTimeout(()=>print(),300)<\/script></body></html>`)
    w.document.close()
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>التقارير</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <TextField type="date" size="small" label="من" InputLabelProps={{ shrink: true }} value={from} onChange={e => setFrom(e.target.value)} />
          <TextField type="date" size="small" label="إلى" InputLabelProps={{ shrink: true }} value={to} onChange={e => setTo(e.target.value)} />
          <Button variant="contained" onClick={loadPeriod}>تقرير فترة</Button>
          <Button variant="outlined" onClick={loadSalary}>تقرير رواتب</Button>
        </Box>
      </Paper>
      {period && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography fontWeight="bold">تقرير الفترة</Typography>
          <Typography>افتتاحي أول يوم: {period.openingFirst} | وارد: {period.totalIncome} | مصروف: {period.totalExpense} | صافي آخر يوم: {period.lastNet}</Typography>
          <Button size="small" sx={{ mt: 1, mr: 1 }} onClick={printPeriod}>طباعة</Button>
          <Button size="small" sx={{ mt: 1 }} onClick={() => csv('period.csv', [
            'البند,المبلغ',
            `واردات,${period.totalIncome}`,
            `مصروفات,${period.totalExpense}`,
            `صافي آخر يوم,${period.lastNet}`,
            ...((period.bySource||[]).map((x:any)=>`مصدر ${x.source},${x.amount}`)),
            ...((period.byCategory||[]).map((x:any)=>`بند ${x.category},${x.amount}`))
          ])}>CSV</Button>
          <Table size="small" sx={{ mt: 1 }}>
            <TableHead><TableRow><TableCell>مصدر</TableCell><TableCell>مبلغ</TableCell></TableRow></TableHead>
            <TableBody>{(period.bySource||[]).map((x:any,i:number)=><TableRow key={i}><TableCell>{x.source}</TableCell><TableCell>{x.amount}</TableCell></TableRow>)}</TableBody>
          </Table>
        </Paper>
      )}
      {salary && (
        <Paper sx={{ p: 2 }}>
          <Typography fontWeight="bold">تقرير الرواتب — إجمالي {salary.total}</Typography>
          <Table size="small">
            <TableHead><TableRow><TableCell>موظف</TableCell><TableCell>الإجمالي</TableCell><TableCell>عدد</TableCell></TableRow></TableHead>
            <TableBody>{(salary.employees||[]).map((x:any,i:number)=><TableRow key={i}><TableCell>{x.name}</TableCell><TableCell>{x.total}</TableCell><TableCell>{x.count}</TableCell></TableRow>)}</TableBody>
          </Table>
          <Button size="small" sx={{ mt: 1 }} onClick={() => csv('salary.csv', ['موظف,الإجمالي,عدد', ...(salary.employees||[]).map((x:any)=>`${x.name},${x.total},${x.count}`)])}>CSV</Button>
        </Paper>
      )}
    </Box>
  )
}

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Paper, Button, Table, TableHead, TableRow, TableCell, TableBody, Alert, CircularProgress, Divider
} from '@mui/material'
import api from '../api/client'
import { toast } from 'react-toastify'
import { useAuth } from '../features/auth'

export default function DayPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const nav = useNavigate()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const d = await api.get(`/Finance/days/${id}`)
      setData(d.data)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'فشل تحميل التفاصيل')
      setData(null)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [id])

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>جاري التحميل…</Typography>
      </Box>
    )
  }
  if (!data) {
    return (
      <Box>
        <Alert severity="error">تعذر تحميل اليوم</Alert>
        <Button sx={{ mt: 2 }} onClick={() => nav('/')}>الرئيسية</Button>
      </Box>
    )
  }

  const day = data.day
  const closed = day.status === 'Closed'

  const printDay = () => {
    const w = window.open('', '_blank')
    if (!w) return
    const incRows = (data.incomes || []).map((x: any) =>
      `<tr><td>${x.source}</td><td>${x.amount}</td><td>${x.notes || ''}</td></tr>`).join('')
    const expRows = (data.expenses || []).map((x: any) =>
      `<tr><td>${x.categoryName}</td><td>${x.amount}</td><td>${x.partnerName || x.employeeName || ''}</td><td>${x.notes || ''}</td></tr>`).join('')
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><title>تقرير يوم</title>
<style>body{font-family:Tahoma;padding:16px;font-size:13px}table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border:1px solid #333;padding:5px}h2{text-align:center}</style></head><body>
<h2>تقرير يوم ${new Date(day.date).toLocaleDateString('ar-EG')}</h2>
<p>الحالة: ${closed ? 'مقفل' : 'مفتوح'}</p>
<p>رصيد افتتاحي: <b>${day.openingBalance}</b></p>
<h3>الواردات</h3><table><tr><th>المصدر</th><th>المبلغ</th><th>ملاحظة</th></tr>${incRows}</table>
<p>إجمالي الواردات: <b>${day.totalIncome}</b></p>
<h3>المصروفات</h3><table><tr><th>البند</th><th>المبلغ</th><th>ربط</th><th>ملاحظة</th></tr>${expRows}</table>
<p>إجمالي المصروفات: <b>${day.totalExpense}</b></p>
<p>صافي اليوم: <b>${day.net}</b></p>
<script>setTimeout(()=>print(),300)<\\/script></body></html>`)
    w.document.close()
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold">
        يوم {new Date(day.date).toLocaleDateString('ar-EG')}
      </Typography>
      <Typography sx={{ mb: 1 }}>
        {closed ? 'مقفل' : 'مفتوح'} | افتتاحي {day.openingBalance} | وارد {day.totalIncome} | مصروف {day.totalExpense} | صافي <b>{day.net}</b>
      </Typography>
      {closed && <Alert severity="warning" sx={{ mb: 1 }}>اليوم مقفل</Alert>}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button size="small" onClick={printDay}>طباعة تقرير اليوم</Button>
        <Button size="small" onClick={() => nav('/incomes')}>الواردات</Button>
        <Button size="small" onClick={() => nav('/expenses')}>المصروفات</Button>
        {closed && user?.role === 'Owner' && (
          <Button size="small" color="warning" variant="contained" onClick={async () => {
            try {
              await api.post(`/Finance/days/${day.id}/reopen`)
              toast.success('تم إعادة الفتح'); load()
            } catch (e: any) { toast.error(e?.response?.data?.message || 'فشل') }
          }}>إعادة فتح (مالك)</Button>
        )}
        {!closed && (
          <Button size="small" color="error" onClick={async () => {
            try {
              await api.post(`/Finance/days/${day.id}/close`)
              toast.success('تم الإقفال'); load()
            } catch (e: any) { toast.error(e?.response?.data?.message || 'فشل') }
          }}>إقفال</Button>
        )}
      </Box>

      <Typography fontWeight="bold">الواردات</Typography>
      <Table size="small" component={Paper} sx={{ mb: 2 }}>
        <TableHead><TableRow><TableCell>المصدر</TableCell><TableCell>المبلغ</TableCell><TableCell>ملاحظة</TableCell><TableCell>بواسطة</TableCell></TableRow></TableHead>
        <TableBody>
          {(data.incomes || []).map((x: any) => (
            <TableRow key={x.id}>
              <TableCell>{x.source}</TableCell>
              <TableCell>{x.amount}</TableCell>
              <TableCell>{x.notes}</TableCell>
              <TableCell>{x.createdByName}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Typography fontWeight="bold">المصروفات</Typography>
      <Table size="small" component={Paper} sx={{ mb: 2 }}>
        <TableHead><TableRow><TableCell>البند</TableCell><TableCell>المبلغ</TableCell><TableCell>ربط</TableCell><TableCell>ملاحظة</TableCell></TableRow></TableHead>
        <TableBody>
          {(data.expenses || []).map((x: any) => (
            <TableRow key={x.id}>
              <TableCell>{x.categoryName}</TableCell>
              <TableCell>{x.amount}</TableCell>
              <TableCell>{x.partnerName || x.employeeName || '—'}</TableCell>
              <TableCell>{x.notes}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {(data.audits || []).length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography fontWeight="bold">سجل التدقيق</Typography>
          <Table size="small" component={Paper}>
            <TableHead><TableRow><TableCell>الوقت</TableCell><TableCell>المستخدم</TableCell><TableCell>الإجراء</TableCell><TableCell>الملخص</TableCell></TableRow></TableHead>
            <TableBody>
              {data.audits.map((a: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{new Date(a.createdAt).toLocaleString('ar-EG')}</TableCell>
                  <TableCell>{a.userName}</TableCell>
                  <TableCell>{a.action}</TableCell>
                  <TableCell>{a.summary}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </Box>
  )
}

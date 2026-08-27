import { useEffect, useState } from 'react'
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button, TextField } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

export default function ArchivePage() {
  const [list, setList] = useState<any[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const nav = useNavigate()
  const load = () => api.get('/Finance/days', { params: { from: from || undefined, to: to || undefined } }).then(r => setList(r.data)).catch(() => {})
  useEffect(() => { load() }, [])
  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>الأرشيف</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField type="date" size="small" label="من" InputLabelProps={{ shrink: true }} value={from} onChange={e => setFrom(e.target.value)} />
        <TextField type="date" size="small" label="إلى" InputLabelProps={{ shrink: true }} value={to} onChange={e => setTo(e.target.value)} />
        <Button variant="contained" onClick={load}>فلترة</Button>
      </Box>
      <Table size="small" component={Paper}>
        <TableHead><TableRow><TableCell>التاريخ</TableCell><TableCell>الحالة</TableCell><TableCell>افتتاحي</TableCell><TableCell>وارد</TableCell><TableCell>مصروف</TableCell><TableCell>صافي</TableCell><TableCell></TableCell></TableRow></TableHead>
        <TableBody>
          {list.map(d => (
            <TableRow key={d.id}>
              <TableCell>{new Date(d.date).toLocaleDateString('ar-EG')}</TableCell>
              <TableCell>{d.status === 'Open' ? 'مفتوح' : 'مقفل'}</TableCell>
              <TableCell>{d.openingBalance}</TableCell>
              <TableCell>{d.totalIncome}</TableCell>
              <TableCell>{d.totalExpense}</TableCell>
              <TableCell>{d.net}</TableCell>
              <TableCell><Button size="small" onClick={() => nav(`/day/${d.id}`)}>فتح</Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}

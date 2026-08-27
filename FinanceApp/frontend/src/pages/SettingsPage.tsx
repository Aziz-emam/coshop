import { useEffect, useState } from 'react'
import {
  Box, Typography, Paper, TextField, Button, Grid, Alert, Table, TableHead, TableRow, TableCell, TableBody, MenuItem
} from '@mui/material'
import api from '../api/client'
import { useAuth } from '../features/auth'
import { toast } from 'react-toastify'

export default function SettingsPage() {
  const { user } = useAuth()
  const [s, setS] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [cats, setCats] = useState<any[]>([])
  const [newCat, setNewCat] = useState({ name: '', code: '' })
  const [newUser, setNewUser] = useState({ username: '', displayName: '', password: '', role: 'Finance' })

  const load = async () => {
    const [a, b, c] = await Promise.all([
      api.get('/Finance/settings'),
      api.get('/Finance/users'),
      api.get('/Finance/categories')
    ])
    setS(a.data); setUsers(b.data); setCats(c.data)
  }
  useEffect(() => {
    if (user?.role === 'Owner') load().catch(() => toast.error('تعذر التحميل'))
  }, [user])

  if (user?.role !== 'Owner') return <Alert severity="warning">الإعدادات للمالك فقط</Alert>
  if (!s) return <Typography>جاري التحميل…</Typography>

  const up = async (type: string, file: File) => {
    const fd = new FormData(); fd.append('file', file)
    await api.post(`/Uploads/${type}`, fd)
    toast.success('تم الرفع'); load()
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>الإعدادات</Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography fontWeight="bold" gutterBottom>الهوية</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" label="اسم النشاط" value={s.businessName}
              onChange={e => setS({ ...s, businessName: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" label="عنوان صفحة الشركاء" value={s.partnersPageTitle}
              onChange={e => setS({ ...s, partnersPageTitle: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" type="number" label="افتتاحي أول يوم" value={s.firstDayOpeningBalance}
              onChange={e => setS({ ...s, firstDayOpeningBalance: +e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" select label="السمة" value={s.iconTheme || 'classic'}
              onChange={e => setS({ ...s, iconTheme: e.target.value })}>
              <MenuItem value="classic">كلاسيك</MenuItem>
              <MenuItem value="green">أخضر</MenuItem>
              <MenuItem value="modern">حديث</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" onClick={async () => {
              await api.put('/Finance/settings', {
                businessName: s.businessName,
                partnersPageTitle: s.partnersPageTitle,
                iconTheme: s.iconTheme,
                firstDayOpeningBalance: s.firstDayOpeningBalance
              })
              toast.success('تم الحفظ')
            }}>حفظ</Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography fontWeight="bold" gutterBottom>الصور والخلفيات</Typography>
        <Grid container spacing={2}>
          {([
            ['logo', 'logoPath', 'الشعار'],
            ['loginBg', 'loginBackgroundPath', 'خلفية تسجيل الدخول'],
            ['homeBg', 'homeBackgroundPath', 'خلفية الرئيسية'],
          ] as const).map(([t, key, label]) => (
            <Grid item xs={12} sm={4} key={t}>
              <Typography variant="body2">{label}</Typography>
              {s[key] && <img src={s[key]} alt="" style={{ maxHeight: 48, display: 'block', margin: '4px 0' }} />}
              <Button component="label" size="small" variant="outlined" sx={{ mr: 1 }}>رفع
                <input hidden type="file" accept="image/*" onChange={e => e.target.files?.[0] && up(t, e.target.files[0])} />
              </Button>
              <Button size="small" color="error" onClick={async () => {
                await api.delete(`/Uploads/media/${t}`); toast.success('تم الحذف'); load()
              }}>حذف</Button>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography fontWeight="bold">بنود المصروفات</Typography>
        {cats.map(c => <Typography key={c.id} variant="body2">• {c.name} ({c.code}){c.isSystem ? ' — نظام' : ''}</Typography>)}
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <TextField size="small" label="اسم" value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} />
          <TextField size="small" label="كود" value={newCat.code} onChange={e => setNewCat({ ...newCat, code: e.target.value })} />
          <Button variant="outlined" onClick={async () => {
            await api.post('/Finance/categories', newCat); setNewCat({ name: '', code: '' }); load()
          }}>إضافة بند</Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography fontWeight="bold" gutterBottom>المستخدمون</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>مستخدم</TableCell>
              <TableCell>الاسم</TableCell>
              <TableCell>الدور</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id}>
                <TableCell>{u.username}</TableCell>
                <TableCell>{u.displayName}</TableCell>
                <TableCell>{u.role === 'Owner' ? 'مالك' : 'مالي'}</TableCell>
                <TableCell>{u.isActive ? 'نشط' : 'معطّل'}</TableCell>
                <TableCell>
                  {u.username !== 'owner' && (
                    <>
                      <Button size="small" onClick={async () => { await api.post(`/Finance/users/${u.id}/toggle`); load() }}>
                        {u.isActive ? 'تعطيل' : 'تفعيل'}
                      </Button>
                      <Button size="small" color="error" onClick={async () => {
                        if (!confirm('حذف الحساب؟')) return
                        await api.delete(`/Finance/users/${u.id}`); toast.success('تم'); load()
                      }}>حذف</Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Grid container spacing={1} sx={{ mt: 2 }}>
          <Grid item xs={6} sm={2}><TextField fullWidth size="small" label="username" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} /></Grid>
          <Grid item xs={6} sm={2}><TextField fullWidth size="small" label="الاسم" value={newUser.displayName} onChange={e => setNewUser({ ...newUser, displayName: e.target.value })} /></Grid>
          <Grid item xs={6} sm={2}><TextField fullWidth size="small" type="password" label="كلمة المرور" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} /></Grid>
          <Grid item xs={6} sm={2}>
            <TextField fullWidth size="small" select label="الدور" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
              <MenuItem value="Finance">مالي</MenuItem>
              <MenuItem value="Owner">مالك</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button fullWidth variant="contained" onClick={async () => {
              try {
                await api.post('/Finance/users', newUser)
                toast.success('تم')
                setNewUser({ username: '', displayName: '', password: '', role: 'Finance' })
                load()
              } catch (e: any) { toast.error(e?.response?.data?.message || 'فشل') }
            }}>إضافة مستخدم</Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  )
}

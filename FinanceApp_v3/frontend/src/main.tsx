import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, CssBaseline, createTheme } from '@mui/material'
import { arSA } from '@mui/material/locale'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import App from './App'
import { AuthProvider } from './features/auth'

const theme = createTheme({ direction: 'rtl', typography: { fontFamily: 'Tahoma, Arial, sans-serif' }, palette: { primary: { main: '#1b5e20' } } }, arSA)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <App />
          <ToastContainer position="top-center" rtl autoClose={1800} closeOnClick pauseOnHover={false} limit={3} />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
)

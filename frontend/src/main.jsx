import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { ToastProvider } from './components/UI/Toast'
import { ConfirmProvider } from './components/UI/ConfirmDialog'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename="/qr_app/">
      <ToastProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
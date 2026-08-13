import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { disableZoom } from './utils/disableZoom';
import { disableBounce } from './utils/disableBounce'; // 👈 NEW

disableZoom();
//disableBounce(); //  NEW


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

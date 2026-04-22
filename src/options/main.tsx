import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Options from '@/options/Options'
import './options.css'

createRoot(document.getElementById('options-root')!).render(
  <StrictMode>
    <Options />
  </StrictMode>,
)

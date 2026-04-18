import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

console.log('MAIN.TSX: Checking root element...');
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('MAIN.TSX: Root element NOT FOUND!');
} else {
  console.log('MAIN.TSX: Root element found, mounting App...');
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

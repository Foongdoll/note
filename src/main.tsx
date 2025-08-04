import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { GameUIProvider } from './components/GameUIProvider.tsx'

createRoot(document.getElementById('root')!).render(
   <GameUIProvider>
    <App />
  </GameUIProvider>
)

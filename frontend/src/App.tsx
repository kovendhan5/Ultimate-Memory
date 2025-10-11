import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Analytics from './pages/Analytics'
import Chat from './pages/Chat'
import Dashboard from './pages/Dashboard'
import Memories from './pages/Memories'
import Settings from './pages/Settings'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/memories" element={<Memories />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}

export default App

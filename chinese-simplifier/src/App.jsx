import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import Home from './Home'
import ChineseSimplifier from './ChineseSimplifier'
import NewsSearch from './NewsSearch'
import ChatInterface from './ChatInterface'
import Reader from './Reader'
import Listen from './Listen'
import Vocabulary from './Vocabulary'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/simplifier" element={<ChineseSimplifier />} />
          <Route path="/news" element={<NewsSearch />} />
          <Route path="/chat" element={<ChatInterface />} />
          <Route path="/reader" element={<Reader />} />
          <Route path="/listen" element={<Listen />} />
          <Route path="/vocabulary" element={<Vocabulary />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App

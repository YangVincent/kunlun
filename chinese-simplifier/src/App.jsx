import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './Home'
import ChineseSimplifier from './ChineseSimplifier'
import NewsSearch from './NewsSearch'
import ChatInterface from './ChatInterface'
import Reader from './Reader'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/simplifier" element={<ChineseSimplifier />} />
        <Route path="/news" element={<NewsSearch />} />
        <Route path="/chat" element={<ChatInterface />} />
        <Route path="/reader" element={<Reader />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

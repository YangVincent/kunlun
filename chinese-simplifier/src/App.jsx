import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ChineseSimplifier from './ChineseSimplifier'
import NewsSearch from './NewsSearch'
import ChatInterface from './ChatInterface'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChineseSimplifier />} />
        <Route path="/news" element={<NewsSearch />} />
        <Route path="/chat" element={<ChatInterface />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

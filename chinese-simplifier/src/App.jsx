import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ChineseSimplifier from './ChineseSimplifier'
import NewsSearch from './NewsSearch'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChineseSimplifier />} />
        <Route path="/news" element={<NewsSearch />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

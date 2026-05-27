import { Routes, Route, Navigate } from 'react-router'
import { AppShell } from './components/layout/AppShell'
import ProjectList from './routes/ProjectList'
import ProjectDetail from './routes/ProjectDetail'
import BoardView from './routes/BoardView'
import SearchPage from './routes/SearchPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/project/:projectId" element={<ProjectDetail />} />
        <Route path="/board/:boardId" element={<BoardView />} />
        <Route path="/search" element={<SearchPage />} />
      </Route>
    </Routes>
  )
}

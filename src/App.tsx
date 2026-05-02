import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import SearchPage from './pages/SearchPage'
import MovieDetailPage from './pages/MovieDetailPage'
import ListsPage from './pages/ListsPage'
import ListDetailPage from './pages/ListDetailPage'
import ProfilePage from './pages/ProfilePage'
import TrendingPage from './pages/TrendingPage'
import LikedPage from './pages/LikedPage'
import GamesPage from './pages/GamesPage'
import Login from './pages/Login'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/movie/:id" element={<MovieDetailPage />} />
      <Route path="/lists" element={<ListsPage />} />
      <Route path="/list/:id" element={<ListDetailPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/profile/:userId/:userType" element={<ProfilePage />} />
      <Route path="/trending" element={<TrendingPage />} />
      <Route path="/games" element={<GamesPage />} />
      <Route path="/liked" element={<LikedPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

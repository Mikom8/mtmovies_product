import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Browse from './pages/Browse';
import WatchPage from './pages/WatchPage';
import SeriesDetails from './pages/SeriesDetails';
import MovieDetails from './pages/MovieDetails';
import WatchSeriesPage from './pages/WatchSeriesPage';
import ChoosePlan from './pages/ChoosePlan';
import Account from './pages/Account';
import MyList from './pages/MyList';
import SearchPage from './pages/SearchPage';
import MoviesPage from './pages/MoviesPage';
import SeriesPage from './pages/SeriesPage';

// Protect the /browse route
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/browse"
        element={
          <ProtectedRoute>
            <Browse />
          </ProtectedRoute>
        }
      />
      <Route
        path="/choose-plan"
        element={
          <ProtectedRoute>
            <ChoosePlan />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account"
        element={
          <ProtectedRoute>
            <Account />
          </ProtectedRoute>
        }
      />
      <Route
        path="/watch/:id"
        element={
          <ProtectedRoute>
            <WatchPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/series/:id"
        element={
          <ProtectedRoute>
            <SeriesDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/movie/:id"
        element={
          <ProtectedRoute>
            <MovieDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/watch-series/:seriesId/s/:seasonNum/e/:epNum"
        element={
          <ProtectedRoute>
            <WatchSeriesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-list"
        element={
          <ProtectedRoute>
            <MyList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/movies"
        element={
          <ProtectedRoute>
            <MoviesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tv-series"
        element={
          <ProtectedRoute>
            <SeriesPage />
          </ProtectedRoute>
        }
      />
      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

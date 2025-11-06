import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import LobbyPage from './pages/LobbyPage';
import WaitingRoom from './pages/WaitingRoom';
import GamePage from './pages/GamePage';
import ResultPage from './pages/ResultPage';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        color: 'white',
        fontSize: '18px'
      }}>
        Carregando...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/lobby" /> : <LoginPage />} 
        />
        <Route 
          path="/signup" 
          element={user ? <Navigate to="/lobby" /> : <SignUpPage />} 
        />
        <Route 
          path="/lobby" 
          element={user ? <LobbyPage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/waiting/:matchId" 
          element={user ? <WaitingRoom /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/game/:matchId" 
          element={user ? <GamePage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/result/:matchId" 
          element={user ? <ResultPage /> : <Navigate to="/login" />} 
        />
        <Route path="/" element={<Navigate to={user ? "/lobby" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;


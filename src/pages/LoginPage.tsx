import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Auth.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      navigate('/lobby');
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container auth-container">
      <div className="auth-box">
        <h1 className="auth-title">Jogo da Velha</h1>
        <form onSubmit={handleLogin} className="auth-form">
          {error && <div className="error-message">{error}</div>}
          <input
            type="email"
            className="input-field"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <input
            type="password"
            className="input-field"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          <Link to="/signup" className="btn btn-secondary">
            Criar Conta
          </Link>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;


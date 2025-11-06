import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Auth.css';

function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0],
          },
        },
      });

      if (error) throw error;

      navigate('/lobby');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container auth-container">
      <div className="auth-box">
        <h1 className="auth-title">Criar Conta</h1>
        <form onSubmit={handleSignUp} className="auth-form">
          {error && <div className="error-message">{error}</div>}
          <input
            type="text"
            className="input-field"
            placeholder="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
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
            minLength={6}
            disabled={loading}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Criando...' : 'Criar Conta'}
          </button>
          <Link to="/login" className="btn btn-secondary">
            Já tenho uma conta
          </Link>
        </form>
      </div>
    </div>
  );
}

export default SignUpPage;


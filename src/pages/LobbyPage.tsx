import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import './LobbyPage.css';

function LobbyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [searchingMatch, setSearchingMatch] = useState(false);
  const [joiningByCode, setJoiningByCode] = useState(false);
  const [matchCode, setMatchCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setUser(data);
      } else {
        // Criar perfil se não existir
        const { data: newProfile } = await supabase
          .from('user_profiles')
          .insert({
            id: authUser.id,
            email: authUser.email || '',
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0],
          })
          .select()
          .single();

        if (newProfile) {
          setUser(newProfile);
        }
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePublicMatch = async () => {
    setCreatingMatch(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data, error } = await supabase
        .from('matches')
        .insert({
          player1_id: authUser.id,
          status: 'waiting',
          is_private: false,
        })
        .select()
        .single();

      if (error) throw error;

      navigate(`/waiting/${data.id}`);
    } catch (err) {
      console.error('Error creating match:', err);
      alert('Erro ao criar partida');
    } finally {
      setCreatingMatch(false);
    }
  };

  const handleCreatePrivateMatch = async () => {
    setCreatingMatch(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Gerar código único
      const code = await generateRandomCode();

      const { data, error } = await supabase
        .from('matches')
        .insert({
          player1_id: authUser.id,
          status: 'waiting',
          is_private: true,
          code: code,
        })
        .select()
        .single();

      if (error) throw error;

      navigate(`/waiting/${data.id}`);
    } catch (err) {
      console.error('Error creating private match:', err);
      alert('Erro ao criar partida privada');
    } finally {
      setCreatingMatch(false);
    }
  };

  const generateRandomCode = async (): Promise<string> => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      // Verificar se código já existe
      const { data } = await supabase
        .from('matches')
        .select('id')
        .eq('code', code)
        .maybeSingle();

      if (!data) {
        return code; // Código único encontrado
      }
      
      attempts++;
    } while (attempts < maxAttempts);

    // Se não encontrou código único após tentativas, adicionar timestamp
    return code + Date.now().toString().slice(-2);
  };

  const handleSearchRandomMatch = async () => {
    setSearchingMatch(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Buscar partida pública disponível
      const { data: availableMatch, error: searchError } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'waiting')
        .eq('is_private', false)
        .neq('player1_id', authUser.id)
        .is('player2_id', null)
        .limit(1)
        .maybeSingle();

      if (searchError) {
        throw searchError;
      }

      if (availableMatch) {
        // Entrar na partida encontrada
        const { error: updateError } = await supabase
          .from('matches')
          .update({
            player2_id: authUser.id,
            status: 'in_progress',
            current_turn: 'player1',
          })
          .eq('id', availableMatch.id);

        if (updateError) throw updateError;

        navigate(`/game/${availableMatch.id}`);
      } else {
        // Não encontrou partida, criar uma nova pública
        setSearchingMatch(false);
        const { data, error } = await supabase
          .from('matches')
          .insert({
            player1_id: authUser.id,
            status: 'waiting',
            is_private: false,
          })
          .select()
          .single();

        if (error) throw error;

        navigate(`/waiting/${data.id}`);
      }
    } catch (err) {
      console.error('Error searching match:', err);
      alert('Erro ao buscar partida');
    } finally {
      setSearchingMatch(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!matchCode || matchCode.length !== 6) {
      alert('Código deve ter 6 caracteres');
      return;
    }

    setJoiningByCode(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        alert('Você precisa estar logado');
        return;
      }

      // Buscar partida por código
      const { data: match, error: searchError } = await supabase
        .from('matches')
        .select('*')
        .eq('code', matchCode.toUpperCase().trim())
        .eq('status', 'waiting')
        .is('player2_id', null)
        .maybeSingle();

      if (searchError) {
        console.error('Search error:', searchError);
        throw searchError;
      }

      if (!match) {
        alert('Partida não encontrada. Verifique se o código está correto ou se a partida já foi iniciada.');
        return;
      }

      if (match.player1_id === authUser.id) {
        alert('Você não pode entrar na sua própria partida');
        return;
      }

      // Entrar na partida
      console.log('Joining match:', match.id);
      const { data: updatedMatch, error: updateError } = await supabase
        .from('matches')
        .update({
          player2_id: authUser.id,
          status: 'in_progress',
          current_turn: 'player1',
        })
        .eq('id', match.id)
        .select()
        .single();

      console.log('Successfully joined match:', updatedMatch);
      navigate(`/game/${match.id}`);
    } catch (err: any) {
      console.error('Error joining match:', err);
      alert(err.message || 'Erro ao entrar na partida. Tente novamente.');
    } finally {
      setJoiningByCode(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '40px' }}>Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container lobby-container">
      <div className="lobby-box">
        <div className="lobby-header">
          <h2>Bem-vindo, {user?.name || user?.email?.split('@')[0] || 'Jogador'}!</h2>
          <button onClick={handleLogout} className="btn-logout">Sair</button>
        </div>

        <div className="lobby-actions">
          <h3 className="section-title">Criar Partida</h3>
          <button
            className="btn btn-primary"
            onClick={handleCreatePublicMatch}
            disabled={creatingMatch || searchingMatch || joiningByCode}
          >
            {creatingMatch ? 'Criando...' : 'Criar Partida Pública'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleCreatePrivateMatch}
            disabled={creatingMatch || searchingMatch || joiningByCode}
          >
            {creatingMatch ? 'Criando...' : 'Criar Partida Privada'}
          </button>

          <h3 className="section-title" style={{ marginTop: '30px' }}>Entrar em Partida</h3>
          <button
            className="btn btn-primary"
            onClick={handleSearchRandomMatch}
            disabled={creatingMatch || searchingMatch || joiningByCode}
          >
            {searchingMatch ? 'Buscando...' : 'Buscar Partida Aleatória'}
          </button>
          
          {!showCodeInput ? (
            <button
              className="btn btn-secondary"
              onClick={() => setShowCodeInput(true)}
              disabled={creatingMatch || searchingMatch || joiningByCode}
            >
              Entrar com Código
            </button>
          ) : (
            <div className="code-input-container">
              <input
                type="text"
                className="code-input"
                placeholder="Digite o código (6 caracteres)"
                value={matchCode}
                onChange={(e) => setMatchCode(e.target.value.toUpperCase().slice(0, 6))}
                maxLength={6}
                disabled={joiningByCode}
                style={{ textTransform: 'uppercase' }}
              />
              <div className="code-input-actions">
                <button
                  className="btn btn-primary btn-small"
                  onClick={handleJoinByCode}
                  disabled={joiningByCode || matchCode.length !== 6}
                >
                  {joiningByCode ? 'Entrando...' : 'Entrar'}
                </button>
                <button
                  className="btn btn-secondary btn-small"
                  onClick={() => {
                    setShowCodeInput(false);
                    setMatchCode('');
                  }}
                  disabled={joiningByCode}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="lobby-stats">
          <h3>Estatísticas</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Vitórias</span>
              <span className="stat-value">{user?.wins || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Empates</span>
              <span className="stat-value">{user?.draws || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Derrotas</span>
              <span className="stat-value">{user?.losses || 0}</span>
            </div>
          </div>
        </div>

        <div className="status-badge">Online</div>
      </div>
    </div>
  );
}

export default LobbyPage;

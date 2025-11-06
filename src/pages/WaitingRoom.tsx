import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Match } from '../types';
import './WaitingRoom.css';

function WaitingRoom() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) {
      navigate('/lobby');
      return;
    }

    loadMatch();
    const lastUpdateTime = { current: Date.now() };
    const unsubscribe = subscribeToMatch(lastUpdateTime);

    // Fallback de segurança: polling apenas a cada 5 segundos caso Realtime falhe
    const pollInterval = setInterval(() => {
      const now = Date.now();
      // Só fazer polling se não houve atualização via Realtime nos últimos 4 segundos
      if (now - lastUpdateTime.current > 4000) {
        console.log('⚠️ Fallback polling: checking for updates (Realtime may be slow)');
        loadMatch();
      }
    }, 5000);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      clearInterval(pollInterval);
    };
  }, [matchId]);

  const loadMatch = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (error) throw error;

      if (data) {
        console.log('Match loaded:', data);
        
        // Atualizar estado apenas se a partida mudou
        setMatch((currentMatch) => {
          // Se já temos dados e nada mudou, não atualizar
          if (currentMatch && 
              currentMatch.player2_id === data.player2_id && 
              currentMatch.status === data.status) {
            return currentMatch;
          }
          return data;
        });

        // Se a partida já tem dois jogadores, redirecionar para o jogo
        if (data.player2_id && data.status === 'in_progress') {
          console.log('Match already has 2 players, redirecting');
          navigate(`/game/${matchId}`);
        }
      }
    } catch (err) {
      console.error('Error loading match:', err);
      // Não navegar para lobby em caso de erro no polling, apenas logar
      if (loading) {
        navigate('/lobby');
      }
    } finally {
      if (loading) {
        setLoading(false);
      }
    }
  };

  const subscribeToMatch = (lastUpdateTimeRef: { current: number }) => {
    if (!matchId) return;

    console.log('🔴 Subscribing to Realtime for match:', matchId);

    const channel = supabase
      .channel(`match:${matchId}`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          console.log('✅ REALTIME UPDATE RECEIVED:', payload);
          const updatedMatch = payload.new as Match;
          
          // Atualizar timestamp
          lastUpdateTimeRef.current = Date.now();
          
          setMatch(updatedMatch);

          // Se segundo jogador entrou, redirecionar para o jogo
          if (updatedMatch.player2_id && updatedMatch.status === 'in_progress') {
            console.log('✅ Player 2 joined via Realtime, redirecting to game');
            navigate(`/game/${matchId}`);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime subscription ACTIVE - listening for player 2');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime subscription ERROR');
        } else {
          console.log('🟡 Realtime subscription status:', status);
        }
      });

    return () => {
      console.log('🔴 Unsubscribing from Realtime');
      supabase.removeChannel(channel);
    };
  };

  const handleCancel = async () => {
    if (!matchId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Verificar se é o criador da partida
      const { data: matchData } = await supabase
        .from('matches')
        .select('player1_id')
        .eq('id', matchId)
        .single();

      if (matchData?.player1_id === user.id) {
        // Deletar partida se ainda não tem segundo jogador
        await supabase.from('matches').delete().eq('id', matchId);
      }
    } catch (err) {
      console.error('Error canceling match:', err);
    }

    navigate('/lobby');
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '40px' }}>Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container waiting-container">
      <div className="waiting-box">
        <h2 className="waiting-title">Aguardando oponente...</h2>
        
        {match?.is_private && match?.code && (
          <div className="match-code-display">
            <p style={{ marginBottom: '10px', color: '#666' }}>Código da partida:</p>
            <div className="code-display">{match.code}</div>
            <p className="code-hint">Compartilhe este código com seu oponente</p>
          </div>
        )}
        
        <div className="spinner-container">
          <div className="spinner"></div>
        </div>
        <p className="waiting-message">
          {match?.is_private ? 'Aguardando oponente entrar com o código...' : 'Procurando jogador disponível...'}
        </p>
        <button className="btn btn-secondary" onClick={handleCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default WaitingRoom;


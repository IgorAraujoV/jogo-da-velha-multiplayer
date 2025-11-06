import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Match } from '../types';
import GameBoard from '../components/GameBoard';
import './ResultPage.css';

function ResultPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) {
      navigate('/lobby');
      return;
    }

    loadMatch();
  }, [matchId]);

  const loadMatch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (error) throw error;

      if (data) {
        setMatch(data);
      }
    } catch (err) {
      console.error('Error loading match:', err);
      navigate('/lobby');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAgain = () => {
    navigate('/lobby');
  };

  const handleBackToLobby = () => {
    navigate('/lobby');
  };

  if (loading || !match) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '40px' }}>Carregando...</div>
      </div>
    );
  }

  const isDraw = match.status === 'finished' && !match.winner_id;
  const isWinner = match.winner_id === currentUserId;

  const board = match.board_state as (string | null)[];

  return (
    <div className="container result-container">
      <div className="result-box">
        {isDraw ? (
          <div className="result-message result-draw">
            🤝 Empate!
          </div>
        ) : isWinner ? (
          <div className="result-message result-winner">
            🎉 Você Venceu!
          </div>
        ) : (
          <div className="result-message result-loss">
            😔 Você Perdeu
          </div>
        )}

        <div className="result-board">
          <GameBoard board={board} onCellClick={() => {}} disabled={true} />
        </div>

        <div className="result-actions">
          <button className="btn btn-primary" onClick={handlePlayAgain}>
            Jogar Novamente
          </button>
          <button className="btn btn-secondary" onClick={handleBackToLobby}>
            Voltar ao Lobby
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResultPage;


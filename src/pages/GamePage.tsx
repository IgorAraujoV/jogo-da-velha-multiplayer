import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Match } from '../types';
import GameBoard from '../components/GameBoard';
import './GamePage.css';

function GamePage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [makingMove, setMakingMove] = useState(false);
  const statsUpdatedRef = useRef<boolean>(false); // Flag para evitar atualizações duplicadas

  useEffect(() => {
    if (!matchId) {
      navigate('/lobby');
      return;
    }

    // Resetar flag quando uma nova partida é carregada
    statsUpdatedRef.current = false;

    let pollInterval: NodeJS.Timeout;
    let unsubscribe: (() => void) | undefined;
    const lastUpdateTime = { current: Date.now() };
    let isMounted = true; // Flag para verificar se componente está montado

    const init = async () => {
      await loadMatch();
      if (isMounted) {
        unsubscribe = subscribeToMatch(lastUpdateTime, () => isMounted);

        // Fallback de segurança: polling apenas a cada 5 segundos caso Realtime falhe
        pollInterval = setInterval(() => {
          if (!isMounted) {
            clearInterval(pollInterval);
            return;
          }
          
          // Verificar se ainda estamos na página do jogo antes de fazer polling
          if (!window.location.pathname.includes('/game/')) {
            console.log('Not on game page, stopping polling');
            clearInterval(pollInterval);
            return;
          }

          const now = Date.now();
          // Só fazer polling se não houve atualização via Realtime nos últimos 4 segundos
          if (now - lastUpdateTime.current > 4000) {
            console.log('⚠️ Fallback polling: checking for updates (Realtime may be slow)');
            loadMatch();
          }
        }, 5000);
      }
    };

    init();

    return () => {
      isMounted = false; // Marcar como desmontado
      if (unsubscribe) {
        unsubscribe();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [matchId]);

  const loadMatch = async () => {
    // Verificar se ainda estamos na página do jogo antes de fazer qualquer coisa
    if (!window.location.pathname.includes('/game/')) {
      console.log('Not on game page, skipping loadMatch');
      return;
    }

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
        // Verificar novamente se ainda estamos na página do jogo
        if (!window.location.pathname.includes('/game/')) {
          console.log('Left game page during loadMatch, ignoring result');
          return;
        }

        // Resetar flag apenas se partida mudou (nova partida)
        if (!match || match.id !== data.id) {
          statsUpdatedRef.current = false;
          console.log('📊 Stats flag reset: new match loaded');
        }

        // Verificar se a partida está finalizada e ainda não atualizamos as estatísticas
        // IMPORTANTE: updateStats atualiza AMBOS os jogadores, então só precisamos chamar uma vez
        // Usar user.id diretamente porque setCurrentUserId é assíncrono e pode não estar atualizado ainda
        if (data.status === 'finished' && !statsUpdatedRef.current && user.id) {
          const isDraw = !data.winner_id;
          const isPlayer1 = data.player1_id === user.id;
          const isPlayer2 = data.player2_id === user.id;
          
          console.log('📊 Match finished detected in loadMatch:', {
            matchId: data.id,
            winnerId: data.winner_id,
            isDraw,
            currentUserId: user.id,
            isPlayer1,
            isPlayer2,
            statsUpdatedFlag: statsUpdatedRef.current
          });

          // Marcar como atualizado ANTES de chamar para evitar duplicação
          statsUpdatedRef.current = true;
          console.log('📊 Calling updateStats from loadMatch - will update BOTH players immediately');
          // Passar user.id explicitamente como userIdOverride porque setCurrentUserId é assíncrono
          updateStats(data.winner_id, isDraw, data, user.id).catch(err => {
            console.error('❌ Error updating stats via loadMatch:', err);
            statsUpdatedRef.current = false; // Resetar em caso de erro para tentar novamente
          });
        }

        // Atualizar estado apenas se realmente mudou
        setMatch((currentMatch) => {
          if (currentMatch && 
              JSON.stringify(currentMatch.board_state) === JSON.stringify(data.board_state) &&
              currentMatch.current_turn === data.current_turn &&
              currentMatch.status === data.status) {
            return currentMatch; // Não atualizar se nada mudou
          }
          return data;
        });

        // Se a partida terminou, redirecionar para resultado (mas não se acabamos de sair)
        if (data.status === 'finished') {
          // Verificar novamente se ainda estamos na página do jogo
          if (window.location.pathname.includes('/game/')) {
            navigate(`/result/${matchId}`);
          }
        }
      }
    } catch (err) {
      console.error('Error loading match:', err);
      // Só navegar se ainda estamos na página do jogo e foi erro de loading inicial
      if (loading && window.location.pathname.includes('/game/')) {
        navigate('/lobby');
      }
    } finally {
      if (loading) {
        setLoading(false);
      }
    }
  };

  const subscribeToMatch = (lastUpdateTimeRef: { current: number } | number, isMountedRef: () => boolean) => {
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
          // Verificar se componente ainda está montado antes de processar
          if (!isMountedRef()) {
            console.log('Component unmounted, ignoring Realtime update');
            return;
          }

          // Verificar se ainda estamos na página do jogo
          if (!window.location.pathname.includes('/game/')) {
            console.log('Not on game page, ignoring Realtime update');
            return;
          }

          console.log('✅ REALTIME UPDATE RECEIVED:', payload);
          const updatedMatch = payload.new as Match;
          
          // Atualizar timestamp da última atualização
          if (typeof lastUpdateTimeRef === 'object') {
            lastUpdateTimeRef.current = Date.now();
          }
          
          // Se a partida terminou, atualizar estatísticas
          if (updatedMatch.status === 'finished') {
            // Verificar novamente se ainda estamos montados e na página correta
            if (!isMountedRef() || !window.location.pathname.includes('/game/')) {
              console.log('Component unmounted or not on game page, ignoring finished match');
              return;
            }

            const isDraw = !updatedMatch.winner_id;
            const isPlayer1 = updatedMatch.player1_id === currentUserId;
            const isPlayer2 = updatedMatch.player2_id === currentUserId;

            // Capturar estado atual antes de atualizar
            setMatch((currentMatch) => {
              console.log('📊 Match finished detected via Realtime:', {
                matchId: updatedMatch.id,
                winnerId: updatedMatch.winner_id,
                isDraw,
                currentUserId,
                isPlayer1,
                isPlayer2,
                currentMatchStatus: currentMatch?.status,
                statsUpdatedFlag: statsUpdatedRef.current
              });

              // IMPORTANTE: Sempre atualizar estatísticas quando detectamos que a partida terminou
              // A função updateStats já atualiza AMBOS os jogadores, então só precisamos chamar uma vez
              if (!statsUpdatedRef.current) {
                console.log('📊 Updating stats via Realtime - will update BOTH players immediately');
                statsUpdatedRef.current = true; // Marcar como atualizado ANTES de chamar
                updateStats(updatedMatch.winner_id, isDraw, updatedMatch).catch(err => {
                  console.error('❌ Error updating stats via Realtime:', err);
                  statsUpdatedRef.current = false; // Resetar em caso de erro
                });
              } else {
                console.log('📊 Stats already updated in this session via Realtime (updateStats already updated both players)');
              }
              
              if (currentMatch) {
                const wasMyMatch = 
                  currentMatch.player1_id === currentUserId || 
                  currentMatch.player2_id === currentUserId;
                
                // Se eu estava na partida e não sou o vencedor, oponente saiu
                if (wasMyMatch && updatedMatch.winner_id !== currentUserId && updatedMatch.winner_id) {
                  setTimeout(() => {
                    if (isMountedRef() && window.location.pathname.includes('/game/')) {
                      alert('Seu oponente saiu da partida. Você venceu!');
                      navigate('/lobby', { replace: true });
                    }
                  }, 100);
                } else if (updatedMatch.winner_id === currentUserId || !updatedMatch.winner_id) {
                  // Partida terminou normalmente (eu ganhei ou empate)
                  setTimeout(() => {
                    if (isMountedRef() && window.location.pathname.includes('/game/')) {
                      navigate(`/result/${matchId}`);
                    }
                  }, 100);
                }
              }
              return updatedMatch;
            });
            return;
          }
          
          // Atualizar estado normalmente se não terminou
          setMatch(updatedMatch);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime subscription ACTIVE - listening for updates');
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

  const checkWinner = (board: (string | null)[]): string | null => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // linhas
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // colunas
      [0, 4, 8], [2, 4, 6], // diagonais
    ];

    for (const line of lines) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a] as string;
      }
    }

    return null;
  };

  const checkDraw = (board: (string | null)[]): boolean => {
    return board.every(cell => cell !== null && cell !== '');
  };

  const handleCellClick = async (index: number) => {
    if (!match || !currentUserId || makingMove) return;

    const board = match.board_state as (string | null)[];
    
    // Validar jogada
    if (board[index] !== null && board[index] !== '') {
      return; // Célula já ocupada
    }

    // Verificar se é o turno do jogador
    const isPlayer1 = match.player1_id === currentUserId;
    const isPlayer2 = match.player2_id === currentUserId;
    
    if (!isPlayer1 && !isPlayer2) {
      return; // Jogador não está nesta partida
    }

    const isMyTurn = 
      (isPlayer1 && match.current_turn === 'player1') ||
      (isPlayer2 && match.current_turn === 'player2');

    if (!isMyTurn) {
      return; // Não é o turno do jogador
    }

    setMakingMove(true);

    try {
      // Criar novo estado do tabuleiro
      const newBoard = [...board];
      const symbol = isPlayer1 ? 'X' : 'O';
      newBoard[index] = symbol;

      // Verificar vitória ou empate
      const winner = checkWinner(newBoard);
      const isDraw = !winner && checkDraw(newBoard);

      let newStatus = match.status;
      let winnerId = match.winner_id;
      let nextTurn = match.current_turn;

      if (winner) {
        newStatus = 'finished';
        winnerId = currentUserId;
      } else if (isDraw) {
        newStatus = 'finished';
        winnerId = null;
      } else {
        // Alternar turno
        nextTurn = match.current_turn === 'player1' ? 'player2' : 'player1';
      }

      // Atualização otimista: atualizar estado local imediatamente
      const optimisticMatch: Match = {
        ...match,
        board_state: newBoard,
        current_turn: nextTurn,
        status: newStatus,
        winner_id: winnerId,
      };
      setMatch(optimisticMatch);

      // Atualizar partida no banco
      const { data: updatedMatch, error: matchError } = await supabase
        .from('matches')
        .update({
          board_state: newBoard,
          current_turn: nextTurn,
          status: newStatus,
          winner_id: winnerId,
        })
        .eq('id', matchId)
        .select()
        .single();

      if (matchError) {
        console.error('Error updating match:', matchError);
        // Reverter atualização otimista em caso de erro
        loadMatch();
        throw matchError;
      }

      // Atualizar com dados reais do banco
      if (updatedMatch) {
        setMatch(updatedMatch);
      }

      // Registrar movimento
      const moveNumber = board.filter(cell => cell !== null && cell !== '').length + 1;
      await supabase
        .from('moves')
        .insert({
          match_id: matchId!,
          player_id: currentUserId,
          position: index,
          move_number: moveNumber,
        });

      // Se partida terminou, atualizar estatísticas IMEDIATAMENTE para ambos os jogadores
      if (newStatus === 'finished') {
        const isPlayer1 = match.player1_id === currentUserId;
        const isPlayer2 = match.player2_id === currentUserId;
        
        console.log('📊 Match finished in handleCellClick:', {
          matchId: match.id,
          winnerId,
          isDraw,
          currentUserId,
          isPlayer1,
          isPlayer2,
          statsUpdatedFlag: statsUpdatedRef.current
        });

        // Sempre atualizar estatísticas quando a partida termina, independentemente da flag
        // A flag só previne atualizações duplicadas se já atualizamos nesta sessão
        if (!statsUpdatedRef.current) {
          statsUpdatedRef.current = true; // Marcar como atualizado ANTES de chamar
          console.log('📊 Calling updateStats from handleCellClick - will update BOTH players');
          await updateStats(winnerId, isDraw, match).catch(err => {
            console.error('❌ Error updating stats in handleCellClick:', err);
            statsUpdatedRef.current = false; // Resetar em caso de erro
          });
        } else {
          console.log('📊 Stats already updated in this session, skipping (but updateStats already updated both players)');
        }
        
        // Pequeno delay antes de redirecionar para mostrar o resultado
        setTimeout(() => {
          navigate(`/result/${matchId}`);
        }, 500);
      }
    } catch (err) {
      console.error('Error making move:', err);
      alert('Erro ao fazer jogada');
      // Recarregar estado atual do banco
      loadMatch();
    } finally {
      setMakingMove(false);
    }
  };

  const updateStats = async (winnerId: string | null, isDraw: boolean, matchToUse?: Match | null, userIdOverride?: string | null) => {
    const matchData = matchToUse || match;
    // Usar userIdOverride se fornecido, caso contrário usar currentUserId
    const userIdToUse = userIdOverride || currentUserId;
    
    if (!matchData || !userIdToUse) {
      console.error('❌ Cannot update stats: missing match or userId', { 
        matchData, 
        currentUserId, 
        userIdOverride,
        userIdToUse 
      });
      return;
    }

    const isPlayer1 = matchData.player1_id === userIdToUse;
    const isPlayer2 = matchData.player2_id === userIdToUse;
    const otherPlayerId = isPlayer1 ? matchData.player2_id : matchData.player1_id;

    console.log('📊 updateStats called:', {
      matchId: matchData.id,
      winnerId,
      isDraw,
      currentUserId: userIdToUse,
      isPlayer1,
      isPlayer2,
      otherPlayerId,
      player1_id: matchData.player1_id,
      player2_id: matchData.player2_id,
      matchStatus: matchData.status,
      calledFrom: matchToUse ? 'external' : 'internal',
      userIdOverride: userIdOverride || 'none'
    });

    try {
      if (!otherPlayerId) {
        console.error('❌ Cannot update stats: missing other player', { matchData, userIdToUse });
        return;
      }

      // Atualizar estatísticas do jogador atual
      const { data: currentProfile, error: currentError } = await supabase
        .from('user_profiles')
        .select('wins, draws, losses')
        .eq('id', userIdToUse)
        .single();

      if (currentError) {
        console.error('❌ Error fetching current profile:', currentError);
        throw currentError;
      }

      if (!currentProfile) {
        console.error('❌ Current profile not found');
        return;
      }

      // Buscar perfil do oponente ANTES de calcular updates
      const { data: otherProfile, error: otherError } = await supabase
        .from('user_profiles')
        .select('wins, draws, losses')
        .eq('id', otherPlayerId)
        .single();

      if (otherError) {
        console.error('❌ Error fetching other profile:', otherError);
        throw otherError;
      }

      if (!otherProfile) {
        console.error('❌ Other profile not found');
        return;
      }

      console.log('📊 Current stats before update:', {
        currentPlayer: {
          id: userIdToUse,
          wins: currentProfile.wins,
          draws: currentProfile.draws,
          losses: currentProfile.losses
        },
        otherPlayer: {
          id: otherPlayerId,
          wins: otherProfile.wins,
          draws: otherProfile.draws,
          losses: otherProfile.losses
        }
      });

      let currentUpdates: any = {};
      let otherUpdates: any = {};

      if (isDraw) {
        // Empate: ambos ganham empate
        currentUpdates.draws = (currentProfile.draws || 0) + 1;
        otherUpdates.draws = (otherProfile.draws || 0) + 1;
        console.log('📊 Result: DRAW - both players get +1 draw');
      } else if (winnerId === userIdToUse) {
        // Jogador atual ganhou
        currentUpdates.wins = (currentProfile.wins || 0) + 1;
        otherUpdates.losses = (otherProfile.losses || 0) + 1;
        console.log('📊 Result: CURRENT PLAYER WINS - current gets +1 win, other gets +1 loss');
      } else if (winnerId === otherPlayerId) {
        // Oponente ganhou
        currentUpdates.losses = (currentProfile.losses || 0) + 1;
        otherUpdates.wins = (otherProfile.wins || 0) + 1;
        console.log('📊 Result: OTHER PLAYER WINS - current gets +1 loss, other gets +1 win');
      } else {
        console.error('❌ Invalid state: no winner and not a draw', { winnerId, userIdToUse, otherPlayerId, isDraw });
        return;
      }

      // IMPORTANTE: Esta função SEMPRE atualiza AMBOS os jogadores simultaneamente
      // Não importa quem chamou (player1 ou player2), ambos terão suas estatísticas atualizadas

      // Atualizar jogador atual PRIMEIRO
      if (Object.keys(currentUpdates).length > 0) {
        console.log('📊 Updating current player stats:', currentUpdates);
        const { error: updateCurrentError } = await supabase
          .from('user_profiles')
          .update(currentUpdates)
          .eq('id', userIdToUse);

        if (updateCurrentError) {
          console.error('❌ Error updating current profile:', updateCurrentError);
          throw updateCurrentError;
        }

        console.log('✅ Successfully updated current player stats:', currentUpdates);
      } else {
        console.error('❌ No updates for current player!', { winnerId, userIdToUse, isDraw });
      }

      // Atualizar oponente IMEDIATAMENTE DEPOIS
      if (Object.keys(otherUpdates).length > 0) {
        console.log('📊 Updating other player stats:', otherUpdates);
        const { error: updateOtherError } = await supabase
          .from('user_profiles')
          .update(otherUpdates)
          .eq('id', otherPlayerId);

        if (updateOtherError) {
          console.error('❌ Error updating other profile:', updateOtherError);
          throw updateOtherError;
        }

        console.log('✅ Successfully updated other player stats:', otherUpdates);
      } else {
        console.error('❌ No updates for other player!', { winnerId, userIdToUse, otherPlayerId, isDraw });
      }

      console.log('✅ Stats update completed successfully - BOTH PLAYERS UPDATED');
    } catch (err) {
      console.error('❌ Error updating stats:', err);
      // Não chamar updateStatsAlternative aqui para evitar loop
    }
  };

  const handleLeaveMatch = async () => {
    if (!match || !currentUserId) return;

    const confirmLeave = window.confirm(
      'Tem certeza que deseja sair da partida? Isso contará como derrota para você e vitória para o oponente.'
    );

    if (!confirmLeave) return;

    try {
      const isPlayer1 = match.player1_id === currentUserId;
      const isPlayer2 = match.player2_id === currentUserId;
      
      if (!isPlayer1 && !isPlayer2) {
        navigate('/lobby');
        return;
      }

      // Determinar o vencedor (oponente)
      const winnerId = isPlayer1 ? match.player2_id : match.player1_id;

      // Atualizar partida: marcar como finalizada com vitória do oponente
      const { error: matchError } = await supabase
        .from('matches')
        .update({
          status: 'finished',
          winner_id: winnerId,
        })
        .eq('id', matchId);

      if (matchError) {
        console.error('Error updating match:', matchError);
        throw matchError;
      }

      // Atualizar estatísticas
      if (winnerId) {
        // Vitória para o oponente
        const { data: winnerProfile } = await supabase
          .from('user_profiles')
          .select('wins')
          .eq('id', winnerId)
          .single();

        if (winnerProfile) {
          await supabase
            .from('user_profiles')
            .update({ wins: (winnerProfile.wins || 0) + 1 })
            .eq('id', winnerId);
        }

        // Derrota para quem saiu
        const { data: loserProfile } = await supabase
          .from('user_profiles')
          .select('losses')
          .eq('id', currentUserId)
          .single();

        if (loserProfile) {
          await supabase
            .from('user_profiles')
            .update({ losses: (loserProfile.losses || 0) + 1 })
            .eq('id', currentUserId);
        }
      }

      // Aguardar um pouco para garantir que a atualização foi propagada
      await new Promise(resolve => setTimeout(resolve, 500));

      // Redirecionar para o lobby usando replace para evitar histórico
      navigate('/lobby', { replace: true });
    } catch (err) {
      console.error('Error leaving match:', err);
      alert('Erro ao sair da partida');
    }
  };

  if (loading || !match) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '40px' }}>Carregando...</div>
      </div>
    );
  }

  const isPlayer1 = match.player1_id === currentUserId;
  const isPlayer2 = match.player2_id === currentUserId;
  const mySymbol = isPlayer1 ? 'X' : 'O';
  const opponentSymbol = isPlayer1 ? 'O' : 'X';
  const isMyTurn = 
    (isPlayer1 && match.current_turn === 'player1') ||
    (isPlayer2 && match.current_turn === 'player2');

  const board = match.board_state as (string | null)[];

  return (
    <div className="container game-container">
      <div className="game-box">
        <div className="game-header">
          <div className="game-info">
            <p>
              <strong>Você ({mySymbol})</strong> vs{' '}
              <strong>Oponente ({opponentSymbol})</strong>
            </p>
          </div>
          <button 
            className="btn-leave-match" 
            onClick={handleLeaveMatch}
            disabled={makingMove}
          >
            Sair da Partida
          </button>
        </div>

        {isMyTurn && !makingMove && (
          <div className="player-turn">
            <p>Sua vez!</p>
          </div>
        )}

        {!isMyTurn && !makingMove && (
          <div className="player-turn waiting">
            <p>Aguardando oponente...</p>
          </div>
        )}

        {makingMove && (
          <div className="player-turn processing">
            <p>Processando jogada...</p>
          </div>
        )}

        <GameBoard 
          board={board} 
          onCellClick={handleCellClick}
          disabled={!isMyTurn || makingMove}
        />

        <p className="game-hint">Clique em uma célula vazia para jogar</p>
      </div>
    </div>
  );
}

export default GamePage;


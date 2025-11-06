import './GameBoard.css';

interface GameBoardProps {
  board: (string | null)[];
  onCellClick: (index: number) => void;
  disabled?: boolean;
}

function GameBoard({ board, onCellClick, disabled }: GameBoardProps) {
  const getCellContent = (value: string | null) => {
    if (!value) return null;
    return <span className={value.toLowerCase()}>{value}</span>;
  };

  return (
    <div className="game-board">
      {board.map((cell, index) => (
        <button
          key={index}
          className={`cell ${cell ? cell.toLowerCase() : ''}`}
          onClick={() => onCellClick(index)}
          disabled={disabled || !!cell}
        >
          {getCellContent(cell)}
        </button>
      ))}
    </div>
  );
}

export default GameBoard;


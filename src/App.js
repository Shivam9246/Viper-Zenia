import './App.css';
import { useState } from 'react';
import Board from './Board/Board.jsx';

function App() {
  const [level, setLevel] = useState(null);

  if (!level) {
    return (
      <div className={`App home`}>
        <div className="home-inner">
          <h1 className="home-title">Snake Game</h1>
          <p className="home-sub">Choose a level to begin</p>
          <div className="home-controls">
            <button className="level-btn" onClick={() => setLevel(1)}>
              Level 1
            </button>
            <button className="level-btn level-btn-2" onClick={() => setLevel(2)}>
              Level 2
            </button>
          </div>
          <small className="home-hint">Tip: Use arrow keys to control the snake</small>
        </div>
      </div>
    );
  }

  return (
    <div className={`App playing`}>
      <Board level={level} onExit={() => setLevel(null)} />
    </div>
  );
}

export default App;

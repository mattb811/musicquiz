/* global plausible */
import React, { useEffect, useState } from "react";
import songsData from "./songs.json";
import "./App.css";

const TOTAL_ROUNDS = 5;

function App() {
  const [songs, setSongs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guess, setGuess] = useState(1985);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [coverUrl, setCoverUrl] = useState("/records.jpg");
  const [guesses, setGuesses] = useState([]);
  const [bestScore, setBestScore] = useState(
    parseInt(localStorage.getItem("bestScore")) || 0
  );

  useEffect(() => {
    const shuffled = [...songsData].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, TOTAL_ROUNDS);
    setSelectedSongs(selected);
    plausible("GameStarted");
  }, []);

  useEffect(() => {
    setCoverUrl("/records.jpg");
  }, [songs, currentIndex]);

  const handleSubmitGuess = () => {
    const actualYear = selectedSongs[currentIndex].year;
    const difference = Math.abs(guess - actualYear);
    const roundScore = Math.max(0, 1000 - difference * 50);
    const updatedScore = score + roundScore;
    setScore(updatedScore);
    plausible("GuessSubmitted", { props: { decade: Math.floor(guess / 10) * 10 } });

    setGuesses([
      ...guesses,
      {
        song: selectedSongs[currentIndex],
        guess,
        actual: actualYear,
        roundScore,
      },
    ]);

    if (currentIndex === TOTAL_ROUNDS - 1) {
      setGameOver(true);
      if (updatedScore > bestScore) {
        localStorage.setItem("bestScore", updatedScore);
        setBestScore(updatedScore);
      }
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleRestart = () => {
    const shuffled = [...songsData].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, TOTAL_ROUNDS);
    setSelectedSongs(selected);
    setCurrentIndex(0);
    setScore(0);
    setGuess(1985);
    setGameOver(false);
    setGuesses([]);
    plausible("GameStarted");
  };

  const handleShare = () => {
    const message = `🎵 I scored ${score} on ChartGuess! Can you beat me?\n\nPlay now: https://chartguess.com`;
    navigator.clipboard.writeText(message);
    alert("Score copied to clipboard! Share it with your friends.");
    plausible("ScoreShared");
  };

  return (
    <div className="App">
      <h1>🎵 ChartGuess</h1>
      <p>Can you guess the year this was number 1 in the UK?</p>
      <p><strong>Best Score:</strong> {bestScore}</p>

      {!gameOver && selectedSongs.length > 0 && (
        <div className="quiz-card">
          <img src={coverUrl} alt="record cover" className="cover" />
          <h2>{selectedSongs[currentIndex].title}</h2>
          <h3>{selectedSongs[currentIndex].artist}</h3>

          <input
            type="range"
            min="1960"
            max="2012"
            value={guess}
            onChange={(e) => setGuess(parseInt(e.target.value))}
            className="slider"
          />
          <div className="year-thumb">{guess}</div>

          <div className="decades">
            {Array.from({ length: 6 }, (_, i) => 1960 + i * 10).map((year) => (
              <span key={year} className="decade-label">{year}</span>
            ))}
            <span className="decade-label">2012</span>
          </div>

          <button onClick={handleSubmitGuess}>Submit</button>
        </div>
      )}

      {gameOver && (
        <div className="quiz-card">
          <h2>Game Over!</h2>
          <p>Your score: <strong>{score}</strong></p>
          <p>Best score: <strong>{bestScore}</strong></p>

          <table className="results-table">
            <thead>
              <tr>
                <th>🎵 Song</th>
                <th>Your Guess</th>
                <th>Actual</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {guesses.map(({ song, guess, actual, roundScore }, index) => {
                const difference = Math.abs(guess - actual);
                let emoji = "❌";
                if (difference <= 1) emoji = "🎯";
                else if (difference <= 3) emoji = "👍";
                else if (difference <= 5) emoji = "😬";

                let scoreClass = "score-poor";
                if (roundScore > 800) scoreClass = "score-good";
                else if (roundScore > 500) scoreClass = "score-okay";

                return (
                  <tr key={index}>
                    <td>{emoji} {song.title} – {song.artist}</td>
                    <td>{guess}</td>
                    <td>{actual}</td>
                    <td className={scoreClass}>{roundScore}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <button onClick={handleRestart}>Play Again</button>
          <button onClick={handleShare}>Share Score</button>
        </div>
      )}
    </div>
  );
}

export default App;

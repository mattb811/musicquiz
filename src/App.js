import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [songs, setSongs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guess, setGuess] = useState(1990);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [results, setResults] = useState([]);
  const [coverUrl, setCoverUrl] = useState("/records.jpg");
  const [bestScore, setBestScore] = useState(
    parseInt(localStorage.getItem("bestScore")) || 0
  );
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    fetch("/songs.json")
      .then((res) => res.json())
      .then((data) => {
        const initialSongs = data.sort(() => 0.5 - Math.random()).slice(0, 5);
        setSongs(initialSongs);
      })
      .catch((err) => console.error("Failed to load songs.json", err));
  }, []);

  useEffect(() => {
    setCoverUrl("/records.jpg");
  }, [songs, currentIndex]);

  const handleSubmit = () => {
    const actualYear = parseInt(songs[currentIndex].year);
    const diff = Math.abs(actualYear - guess);
    const songScore = Math.max(0, 1000 - diff * 50);
    const updatedScore = score + songScore;

    const resultEntry = {
      title: songs[currentIndex].title,
      artist: songs[currentIndex].artist,
      actualYear,
      guessedYear: guess,
      songScore,
    };

    setResults([...results, resultEntry]);
    setScore(updatedScore);
    setShowFeedback(true);

    setTimeout(() => {
      setShowFeedback(false);
      if (currentIndex === songs.length - 1) {
        setGameOver(true);
        if (updatedScore > bestScore) {
          setBestScore(updatedScore);
          localStorage.setItem("bestScore", updatedScore.toString());
        }
      } else {
        setCurrentIndex(currentIndex + 1);
      }
    }, 1500);
  };

  const handlePlayAgain = () => {
    fetch("/songs.json")
      .then((res) => res.json())
      .then((data) => {
        const newSongs = data.sort(() => 0.5 - Math.random()).slice(0, 5);
        setSongs(newSongs);
        setCurrentIndex(0);
        setGuess(1990);
        setScore(0);
        setGameOver(false);
        setResults([]);
        setShowFeedback(false);
      });
  };

  const getScoreClass = (score) => {
    if (score >= 900) return "score-good";
    if (score >= 700) return "score-okay";
    return "score-poor";
  };

  return (
    <div className="App">
      <h1>ChartGuess 🎵</h1>
      {!gameOver && songs.length > 0 && (
        <div className="quiz-card">
          <img src={coverUrl} alt="Record cover" className="cover" />

          {songs[currentIndex] && (
            <p className="song-title">
              {songs[currentIndex].title} – {songs[currentIndex].artist}
            </p>
          )}

          <div className="year-thumb">Your guess: {guess}</div>

          <div className="range-wrapper">
            <input
              type="range"
              min="1960"
              max="2012"
              step="1"
              value={guess}
              onChange={(e) => setGuess(parseInt(e.target.value))}
              list="year-ticks"
            />
            <datalist id="year-ticks">
              {Array.from({ length: 2013 - 1960 }, (_, i) => 1960 + i).map(
                (year) => (
                  <option key={year} value={year} />
                )
              )}
            </datalist>
            <div className="year-labels">
              {Array.from({ length: 2013 - 1960 }, (_, i) => 1960 + i).map(
                (year) => (
                  <div className="year-label" key={year}>
                    {year % 10 === 0 ? year : "|"}
                  </div>
                )
              )}
            </div>
          </div>

          <button onClick={handleSubmit}>Submit Guess</button>

          {showFeedback && (
            <div className="answer-feedback">
              🎯 Correct year: <strong>{songs[currentIndex].year}</strong>
            </div>
          )}
        </div>
      )}

      {gameOver && (
        <div className="quiz-card">
          <h2>Game Over!</h2>
          <p>
            Your score: <strong>{score}</strong>
          </p>
          <p>
            Best score: <strong>{bestScore}</strong>
          </p>

          <div className="results-container">
            <table className="results-table">
              <thead>
                <tr>
                  <th>🎵 Song</th>
                  <th>📅 Your Guess</th>
                  <th>✅ Actual</th>
                  <th>🏆 Score</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, index) => (
                  <tr key={index}>
                    <td>
                      {r.title} – {r.artist}
                    </td>
                    <td>{r.guessedYear}</td>
                    <td>{r.actualYear}</td>
                    <td className={getScoreClass(r.songScore)}>{r.songScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={handlePlayAgain}>Play Again</button>
        </div>
      )}

      <div className="ethical-ad-container">
        <p>Ad space: supporting free games via Carbon Ads.</p>
        <div id="carbon-ad" />
      </div>
    </div>
  );
}

export default App;

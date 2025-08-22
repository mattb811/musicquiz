/* global plausible */
import React, { useState, useEffect } from "react";
import songsData from "./songs.json";
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

  useEffect(() => {
    setSongs(songsData.sort(() => 0.5 - Math.random()).slice(0, 5));
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

    if (currentIndex === songs.length - 1) {
      setGameOver(true);
      if (updatedScore > bestScore) {
        setBestScore(updatedScore);
        localStorage.setItem("bestScore", updatedScore.toString());
      }
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePlayAgain = () => {
    const newSongs = songsData.sort(() => 0.5 - Math.random()).slice(0, 5);
    setSongs(newSongs);
    setCurrentIndex(0);
    setGuess(1990);
    setScore(0);
    setGameOver(false);
    setResults([]);
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

          <input
            type="range"
            min="1960"
            max="2012"
            value={guess}
            onChange={(e) => setGuess(parseInt(e.target.value))}
          />

          <div className="decades">
            {[1960, 1970, 1980, 1990, 2000, 2010, 2012].map((year) => (
              <div className="decade-label" key={year}>
                {year}
              </div>
            ))}
          </div>

          <button onClick={handleSubmit}>Submit Guess</button>
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

import React, { useState, useEffect, useMemo, useRef } from "react";
import "./App.css";

const YEAR_MIN = 1960;
const YEAR_MAX = 2012;
const MAX_QUESTIONS = 5;
const BASE_SCORE = 1000;
const PENALTY_PER_YEAR = 50;
const STORAGE_KEY = "bestScore";

function App() {
  const [songs, setSongs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guess, setGuess] = useState(1990);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [results, setResults] = useState([]);
  const [coverUrl, setCoverUrl] = useState("/records.jpg");
  const [bestScore, setBestScore] = useState(
    () => parseInt(localStorage.getItem(STORAGE_KEY), 10) || 0
  );
  const [showFeedback, setShowFeedback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timerRef = useRef(null);

  // Precompute years once
  const years = useMemo(
    () => Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MIN + i),
    []
  );

  // Load a new game
  const loadSongs = () => {
    fetch("/songs.json")
      .then((res) => res.json())
      .then((data) => {
        // Shuffle (Fisher–Yates)
        const arr = [...data];
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        const initial = arr.slice(0, MAX_QUESTIONS);
        setSongs(initial);
        setCurrentIndex(0);
        setGuess(1990);
        setScore(0);
        setGameOver(false);
        setResults([]);
        setShowFeedback(false);
        setIsSubmitting(false);
      })
      .catch((err) => console.error("Failed to load songs.json", err));
  };

  useEffect(() => {
    loadSongs();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Cover art: prefer song cover if present, otherwise fallback
  useEffect(() => {
    const song = songs[currentIndex];
    setCoverUrl(song?.coverUrl || "/records.jpg");
  }, [songs, currentIndex]);

  const handleSubmit = () => {
    if (isSubmitting || !songs[currentIndex]) return; // guard
    setIsSubmitting(true);

    const actualYear = parseInt(songs[currentIndex].year, 10);
    const diff = Math.abs(actualYear - guess);
    const songScore = Math.max(0, BASE_SCORE - diff * PENALTY_PER_YEAR);

    const resultEntry = {
      title: songs[currentIndex].title,
      artist: songs[currentIndex].artist,
      actualYear,
      guessedYear: guess,
      songScore,
      diff,
    };

    setResults((prev) => [...prev, resultEntry]);
    setScore((prev) => prev + songScore);
    setShowFeedback(true);

    // Advance after short delay
    timerRef.current = setTimeout(() => {
      setShowFeedback(false);
      setIsSubmitting(false);

      setCurrentIndex((idx) => {
        const last = idx === songs.length - 1;
        if (last) {
          setGameOver(true);
          const finalScore = (prevScore) => prevScore + 0; // dummy to read latest
          // We can't read prev here; instead compute final directly:
          const updatedScore = (results.reduce((s, r) => s + r.songScore, 0) + songScore);
          if (updatedScore > bestScore) {
            setBestScore(updatedScore);
            localStorage.setItem(STORAGE_KEY, String(updatedScore));
          }
          return idx; // stay on last
        }
        return idx + 1;
      });
    }, 1500);
  };

  const handlePlayAgain = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    loadSongs();
  };

  const getScoreClass = (s) => {
    if (s >= 900) return "score-good";
    if (s >= 700) return "score-okay";
    return "score-poor";
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !gameOver) handleSubmit();
  };

  return (
    <div className="App" onKeyDown={onKeyDown}>
      <h1>ChartGuess 🎵</h1>

      {!gameOver && songs.length > 0 && (
        <div className="quiz-card">
          <img src={coverUrl} alt="Record cover" className="cover" />

          {songs[currentIndex] && (
            <p className="song-title">
              {songs[currentIndex].title} – {songs[currentIndex].artist}
            </p>
          )}

          <label htmlFor="year-slider" className="visually-hidden">
            Choose a year between {YEAR_MIN} and {YEAR_MAX}
          </label>

          <div className="year-thumb" aria-live="polite">
            Your guess: {guess}
          </div>

          <div className="range-wrapper">
            <input
              id="year-slider"
              type="range"
              min={YEAR_MIN}
              max={YEAR_MAX}
              step="1"
              value={guess}
              onChange={(e) => setGuess(parseInt(e.target.value, 10))}
              list="year-ticks"
              disabled={isSubmitting}
            />
            <datalist id="year-ticks">
              {years.map((y) => (
                <option key={y} value={y} />
              ))}
            </datalist>

            <div className="year-labels" aria-hidden="true">
              {years.map((y) => (
                <div className="year-label" key={y}>
                  {y % 10 === 0 ? y : "|"}
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Checking…" : "Submit Guess"}
          </button>

          {showFeedback && (
            <div className="answer-feedback" aria-live="polite">
              🎯 Correct year: <strong>{songs[currentIndex].year}</strong>{' '}
              ({Math.abs(guess - parseInt(songs[currentIndex].year, 10))} year
              {Math.abs(guess - parseInt(songs[currentIndex].year, 10)) === 1 ? "" : "s"} off)
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
                  <th>↕︎ Diff</th>
                  <th>🏆 Score</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, index) => (
                  <tr key={`${r.title}-${index}`}>
                    <td>{r.title} – {r.artist}</td>
                    <td>{r.guessedYear}</td>
                    <td>{r.actualYear}</td>
                    <td>{r.diff}</td>
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

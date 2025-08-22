// App.js
import React, { useState, useEffect } from "react";
import "./App.css";

const YEAR_MIN = 1960;
const YEAR_MAX = 2012;

function App() {
  const [songs, setSongs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guess, setGuess] = useState(YEAR_MIN);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [coverUrl, setCoverUrl] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [results, setResults] = useState([]);
  const [bestScore, setBestScore] = useState(() => {
    const stored = localStorage.getItem("bestScore");
    return stored ? Number(stored) : 0;
  });

  useEffect(() => {
    fetch("/songs.json")
      .then((res) => res.json())
      .then((data) => {
        const randomSongs = data.sort(() => Math.random() - 0.5).slice(0, 5);
        setSongs(randomSongs);
      })
      .catch((err) => {
        console.error("Failed to load songs:", err);
      });
  }, []);

  useEffect(() => {
    setCoverUrl("/records.jpg");
  }, [songs, currentIndex]);

  const handleGuess = () => {
    const currentSong = songs[currentIndex];
    const correctYear = currentSong.Year;
    const difference = Math.abs(guess - correctYear);
    const roundScore = Math.max(0, 1000 - difference * 100);
    setScore((prev) => prev + roundScore);

    setResults((prev) => [
      ...prev,
      {
        title: currentSong.Title,
        artist: currentSong.Artist,
        correctYear: correctYear,
        guess: guess,
        roundScore: roundScore,
      },
    ]);

    setShowAnswer(true);
  };

  const nextSong = () => {
    if (currentIndex + 1 < songs.length) {
      setCurrentIndex(currentIndex + 1);
      setGuess(YEAR_MIN);
      setShowAnswer(false);
    } else {
      if (score > bestScore) {
        setBestScore(score);
        localStorage.setItem("bestScore", score);
      }
      setGameOver(true);
    }
  };

  const handleRestart = () => {
    fetch("/songs.json")
      .then((res) => res.json())
      .then((data) => {
        const randomSongs = data.sort(() => Math.random() - 0.5).slice(0, 5);
        setSongs(randomSongs);
        setCurrentIndex(0);
        setGuess(YEAR_MIN);
        setScore(0);
        setGameOver(false);
        setResults([]);
        setShowAnswer(false);
      });
  };

  const handleShare = () => {
  const message = `I scored ${score} on the Music Quiz! 🎵\nCan you beat me? 👉 https://musicquizgame.com`;

  // Try Web Share API (mobile)
  if (navigator.share) {
    navigator.share({
      title: "My Music Quiz Score",
      text: message,
      url: "https://musicquizgame.com",
    }).catch((err) => console.error("Share failed:", err));
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(message).then(() => {
      alert("Score copied to clipboard! 📋");
    });
  }
};


  if (songs.length === 0) return <p>Loading songs...</p>;

  if (gameOver) {
    return (
      <div className="App">
        <div className="quiz-card">
          <h1>🎉 Game Over!</h1>
          <p>You scored <strong>{score} / 5000</strong></p>
          <p>Your best score: <strong>{bestScore}</strong></p>
          <p>Want to play again and try to beat your score?</p>

          <h2>📊 Breakdown:</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Song</th>
                  <th>Artist</th>
                  <th>Your Guess</th>
                  <th>Correct Year</th>
                  <th>Score</th>
                  <th>🎉</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  let scoreClass = "";
                  let emoji = "";

                  if (r.roundScore === 1000) {
                    scoreClass = "score-perfect";
                    emoji = "🌟";
                  } else if (r.roundScore >= 800) {
                    scoreClass = "score-good";
                    emoji = "👍";
                  } else if (r.roundScore >= 500) {
                    scoreClass = "score-mid";
                    emoji = "⚠️";
                  } else {
                    scoreClass = "score-low";
                    emoji = "❌";
                  }

                  return (
                    <tr key={i}>
                      <td>{r.title}</td>
                      <td>{r.artist}</td>
                      <td>{r.guess}</td>
                      <td>{r.correctYear}</td>
                      <td className={scoreClass}>{r.roundScore}</td>
                      <td>{emoji}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button onClick={handleRestart}>🔁 Play Again</button>
          <button onClick={handleShare}>📤 Share your score</button>

        </div>
      </div>
    );
  }

  const currentSong = songs[currentIndex];

  return (
    <div className="App">
      <div className="quiz-card">
        <h1>🎵 Music Quiz</h1>
        <h2>Round {currentIndex + 1} of {songs.length}</h2>

        <p><strong>Artist:</strong> {currentSong.Artist}</p>
        <p><strong>Song:</strong> {currentSong.Title}</p>

        {coverUrl && (
          <img
            src={coverUrl}
            alt="cover"
            style={{ width: "300px", height: "300px", margin: "20px 0" }}
          />
        )}

        <p>🌟 Your best score so far: <strong>{bestScore}</strong></p>

        <div style={{ width: "100%" }}>
          <div style={{ position: "relative" }}>
            <input
              type="range"
              min={YEAR_MIN}
              max={YEAR_MAX}
              step={1}
              value={guess}
              onChange={(e) => setGuess(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div className="thumb-label" style={{ left: `${((guess - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100}%` }}>
              {guess}
            </div>
          </div>

          <div className="slider-wrapper">
            {Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => {
              const year = YEAR_MIN + i;
              return (
                <div className="label" key={year}>
                  <div className="tick" />
                  {["1960", "1970", "1980", "1990", "2000", "2012"].includes(String(year)) ? year : ""}
                </div>
              );
            })}
          </div>
        </div>

        {!showAnswer ? (
          <>
            <p>Your guess: <strong>{guess}</strong></p>
            <button onClick={handleGuess}>Submit Guess</button>
          </>
        ) : (
          <>
            <p>✅ Correct Year: <strong>{currentSong.Year}</strong></p>
            <button onClick={nextSong}>Next</button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;

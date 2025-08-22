import React, { useState, useEffect, useMemo, useRef } from "react";
import "./App.css";

/* =========================
   Config
   ========================= */
const YEAR_MIN = 1960;
const YEAR_MAX = 2012;
const MAX_QUESTIONS = 5;
const BASE_SCORE = 1000;
const PENALTY_PER_YEAR = 50;
const STORAGE_KEY_BEST = "bestScore";
const COVER_CACHE_KEY = "coverCache_v1";

/* =========================
   Simple cover art + preview cache (localStorage + memory)
   ========================= */
const coverCache = new Map();
(function loadCoverCache() {
  try {
    const raw = localStorage.getItem(COVER_CACHE_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      Object.entries(obj).forEach(([k, v]) => coverCache.set(k, v));
    }
  } catch {
    /* ignore */
  }
})();
function persistCoverCache() {
  const obj = {};
  coverCache.forEach((v, k) => (obj[k] = v));
  try {
    localStorage.setItem(COVER_CACHE_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

async function fetchCoverAndPreview({ title, artist }) {
  if (!title || !artist) return { coverUrl: null, previewUrl: null };
  const key = `${title}—${artist}`.toLowerCase();
  if (coverCache.has(key)) return coverCache.get(key);

  const term = encodeURIComponent(`${title} ${artist}`);
  const url = `https://itunes.apple.com/search?term=${term}&media=music&entity=song&country=gb&limit=3`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`iTunes ${res.status}`);
    const data = await res.json();

    const best =
      data.results.find((r) =>
        r.artistName?.toLowerCase().includes(artist.toLowerCase())
      ) || data.results[0];

    if (!best) {
      const miss = { coverUrl: null, previewUrl: null };
      coverCache.set(key, miss);
      persistCoverCache();
      return miss;
    }

    const coverUrl =
      best.artworkUrl100?.replace("100x100bb", "600x600bb") || null;
    const previewUrl = best.previewUrl || null;

    const hit = { coverUrl, previewUrl };
    coverCache.set(key, hit);
    persistCoverCache();
    return hit;
  } catch (e) {
    console.warn("Cover fetch failed:", e);
    const miss = { coverUrl: null, previewUrl: null };
    coverCache.set(key, miss);
    return miss;
  }
}

/* =========================
   App
   ========================= */
function App() {
  const [songs, setSongs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guess, setGuess] = useState(1990);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [results, setResults] = useState([]);
  const [coverUrl, setCoverUrl] = useState("/records.jpg");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [bestScore, setBestScore] = useState(
    () => parseInt(localStorage.getItem(STORAGE_KEY_BEST), 10) || 0
  );
  const [showFeedback, setShowFeedback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timerRef = useRef(null);

  // Precompute year ticks once
  const years = useMemo(
    () => Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MIN + i),
    []
  );

  // Shuffle helper (Fisher–Yates)
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const loadSongs = () => {
    fetch("/songs.json")
      .then((res) => res.json())
      .then(async (data) => {
        const initial = shuffle(data).slice(0, MAX_QUESTIONS);

        // Enrich with cover/preview in parallel
        const enriched = await Promise.all(
          initial.map(async (s) => {
            const { coverUrl, previewUrl } = await fetchCoverAndPreview({
              title: s.title,
              artist: s.artist,
            });
            return {
              ...s,
              coverUrl: coverUrl || "/records.jpg",
              previewUrl: previewUrl || null,
            };
          })
        );

        setSongs(enriched);
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

  // Update cover + preview for current song
  useEffect(() => {
    const song = songs[currentIndex];
    setCoverUrl(song?.coverUrl || "/records.jpg");
    setPreviewUrl(song?.previewUrl || null);
  }, [songs, currentIndex]);

  // Prefetch next cover for snappier transitions
  useEffect(() => {
    const next = songs[currentIndex + 1];
    if (next?.coverUrl) {
      const img = new Image();
      img.src = next.coverUrl;
    }
  }, [songs, currentIndex]);

  const handleSubmit = () => {
    if (isSubmitting || !songs[currentIndex]) return;
    setIsSubmitting(true);

    const actualYear = parseInt(songs[currentIndex].year, 10);
    const diff = Math.abs(actualYear - guess);
    const songScore = Math.max(0, BASE_SCORE - diff * PENALTY_PER_YEAR);
    const updatedScore = score + songScore; // compute now to avoid stale reads later

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

    // Stop any playing preview
    try {
      const audio = document.querySelector("audio.preview-audio");
      if (audio) audio.pause();
    } catch {
      /* ignore */
    }

    // Advance after a short delay
    timerRef.current = setTimeout(() => {
      setShowFeedback(false);

      const isLast = currentIndex === songs.length - 1;
      if (isLast) {
        setGameOver(true);
        if (updatedScore > bestScore) {
          setBestScore(updatedScore);
          localStorage.setItem(STORAGE_KEY_BEST, String(updatedScore));
        }
        setIsSubmitting(false);
      } else {
        setCurrentIndex((idx) => idx + 1);
        setIsSubmitting(false);
      }
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

          {previewUrl && (
            <audio
              controls
              preload="none"
              src={previewUrl}
              className="preview-audio"
              style={{ marginTop: 8, width: "100%" }}
            />
          )}
          <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
            {previewUrl || coverUrl !== "/records.jpg"
              ? "Cover/preview via iTunes/Apple Music"
              : "\u00A0"}
          </div>

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
              🎯 Correct year: <strong>{songs[currentIndex].year}</strong>{" "}
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
                    <td>
                      {r.title} – {r.artist}
                    </td>
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
    </div>
  );
}

export default App;

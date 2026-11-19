import { useState } from 'react';
import { coverUrl } from '../api.js';

// Every cover is drawn by the app, so it always looks good (and works offline).
// The real cover image (looked up by the server on Open Library) is shown on top when one exists.
const GENRE_COLORS = {
  Classics: '#3d5a80',
  Adventure: '#a8452f',
  "Fantasy & Children's": '#5b4a8a',
  'Horror & Gothic': '#2f4858',
  Mystery: '#1f6f78',
  Philosophy: '#7a5f12',
  'Science Fiction': '#2a6f4f',
};
const FALLBACK = ['#3d5a80', '#1f6f78', '#a8452f', '#5b4a8a', '#7a5f12', '#2f4858'];
export const coverColor = (book) => GENRE_COLORS[book.genre] || FALLBACK[book.id % FALLBACK.length];

export default function Cover({ book }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`cover ${loaded ? 'loaded' : ''}`} style={{ background: coverColor(book) }}>
      <span className="cover-mark" aria-hidden="true">{(book.title || '?').replace(/^(The|A|An)\s+/i, '').charAt(0)}</span>
      <span className="tag">{book.genre}</span>
      <div className="cover-text">
        <span className="cover-title">{book.title}</span>
        <span className="cover-rule" />
        <span className="cover-author">{book.author}</span>
      </div>
      {!failed && (
        <img src={coverUrl(book.id)} alt={`Cover of ${book.title}`} loading="lazy" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
      )}
    </div>
  );
}

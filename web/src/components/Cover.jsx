import { useState } from 'react';

// Every cover is drawn by the app, so it always looks good (and works offline).
// A real cover image, when the source has one and is reachable, is shown on top of it.
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
  return (
    <div className="cover" style={{ background: coverColor(book) }}>
      <span className="cover-mark" aria-hidden="true">{(book.title || '?').replace(/^(The|A|An)\s+/i, '').charAt(0)}</span>
      <span className="tag">{book.genre}</span>
      <div className="cover-text">
        <span className="cover-title">{book.title}</span>
        <span className="cover-rule" />
        <span className="cover-author">{book.author}</span>
      </div>
      {book.cover_url && !failed && (
        <img src={book.cover_url} alt={`Cover of ${book.title}`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      )}
    </div>
  );
}

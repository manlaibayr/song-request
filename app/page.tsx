"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

type YouTubeResult = {
  videoId: string;
  title: string;
  thumbnail: string;
  channel: string;
  duration: string;
  url: string;
};

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [nowPlaying, setNowPlaying] = useState<{ title: string; thumbnail: string; description: string } | null>(null);

  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // YouTube search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<YouTubeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedSong, setSelectedSong] = useState<YouTubeResult | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced YouTube search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setSelectedSong(null);
    setUrl('');

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setSearching(true);
    setShowResults(true);

    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  const handleSelectSong = (song: YouTubeResult) => {
    setSelectedSong(song);
    setUrl(song.url);
    setSearchQuery(song.title);
    setShowResults(false);
  };

  const handleClearSelection = () => {
    setSelectedSong(null);
    setUrl('');
    setSearchQuery('');
    setSearchResults([]);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'asc'));
    const unsub1 = onSnapshot(q, (snap) => setQueueCount(snap.size));

    const unsub2 = onSnapshot(doc(db, 'status', 'nowPlaying'), (snap) => {
      if (snap.exists()) setNowPlaying(snap.data() as any);
      else setNowPlaying(null);
    });

    return () => { unsub1(); unsub2(); };
  }, []);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleSend = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'messages'), {
        description,
        url,
        order: Date.now(),
        createdAt: serverTimestamp()
      });
      const position = queueCount + 1;
      const positionText = position === 1
        ? 'Таны дуу дараагийнх! 🎉'
        : `Таны дуу ${position}-р байранд байна — ${position - 1} дуунаас хойш тоглогдоно 🎵`;
      setIsOpen(false);
      setDescription('');
      setUrl('');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedSong(null);
      showAlert('success', positionText);
    } catch (error) {
      console.error("Error adding document: ", error);
      showAlert('error', 'Илгээхэд алдаа гарлаа. Дахин оролдоно уу.');
    }
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 text-white relative overflow-hidden">
      
      {/* Арын фонны гоёл (Бүдгэрүүлсэн гэрэл) */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* Нүүр хуудасны агуулга */}
      <div className="text-center z-10 max-w-sm">
        <div className="mb-6 inline-flex p-4 bg-indigo-500/10 rounded-full border border-indigo-500/20 animate-pulse">
          <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
          Хөгжмийн Захиалга
        </h1>
        <p className="text-gray-400 text-sm mb-3">
          Сонсохыг хүссэн дууныхаа YouTube линкийг тайлбартай нь хамт илгээнэ үү.
        </p>
        {/* Now Playing Display */}
        {nowPlaying ? (
          <div className="mb-6 w-full max-w-sm" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div className="relative bg-gradient-to-br from-indigo-950/80 via-slate-900/90 to-purple-950/80 border border-indigo-500/30 rounded-2xl p-5 text-left shadow-2xl shadow-indigo-500/20 overflow-hidden">
              {/* Animated background glow */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/15 rounded-full blur-2xl animate-pulse pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-purple-500/15 rounded-full blur-2xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />

              <div className="relative z-10 flex items-center gap-4">
                {/* Thumbnail with glow */}
                <div className="relative shrink-0">
                  <div className="absolute -inset-1 bg-indigo-500/30 rounded-2xl blur-md animate-pulse" />
                  {nowPlaying.thumbnail ? (
                    <img src={nowPlaying.thumbnail} alt="" className="relative w-16 h-16 rounded-xl object-cover border-2 border-indigo-500/40 shadow-lg" />
                  ) : (
                    <div className="relative w-16 h-16 rounded-xl bg-indigo-900/60 border-2 border-indigo-500/40 flex items-center justify-center shadow-lg">
                      <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Song Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                      {/* Equalizer bars */}
                      <span className="flex items-end gap-[2px] h-3">
                        <span className="w-[3px] bg-indigo-400 rounded-full" style={{ animation: 'eqBar 0.8s ease-in-out infinite alternate', height: '40%' }} />
                        <span className="w-[3px] bg-indigo-400 rounded-full" style={{ animation: 'eqBar 0.6s ease-in-out infinite alternate', animationDelay: '0.2s', height: '70%' }} />
                        <span className="w-[3px] bg-indigo-400 rounded-full" style={{ animation: 'eqBar 0.7s ease-in-out infinite alternate', animationDelay: '0.4s', height: '50%' }} />
                      </span>
                      Одоо тоглож байна
                    </span>
                  </div>
                  <p className="text-base font-bold text-white truncate leading-tight">{nowPlaying.title}</p>
                  {nowPlaying.description && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">💬 {nowPlaying.description}</p>
                  )}
                </div>
              </div>
            </div>

            {queueCount > 0 && (
              <p className="text-indigo-400/70 text-xs mt-3 text-center">
                Дараалалд <span className="font-bold text-indigo-300">{queueCount}</span> дуу байна
              </p>
            )}
          </div>
        ) : (
          <div className="mb-6">
            {queueCount > 0 ? (
              <p className="text-indigo-400/70 text-xs mb-5 text-center">
                Дараалалд <span className="font-bold text-indigo-300">{queueCount}</span> дуу байна
              </p>
            ) : (
              <p className="text-gray-600 text-xs mb-5 text-center">Одоогоор дуу тоглохгүй байна 🎧</p>
            )}
          </div>
        )}

        <button
          onClick={() => setIsOpen(true)}
          className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 active:scale-98 transition-all duration-200 text-base"
        >
          Дуу захиалах 🎵
        </button>
      </div>

      {/* ПОПАП МОДАЛ ЦОНХ */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Арын бүдгэрүүлэгч */}
          <div 
            onClick={() => setIsOpen(false)} 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity duration-300"
          ></div>
          
          {/* Модал формоо агуулсан цонх */}
          <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-2xl w-full max-w-md shadow-2xl relative z-10 transition-all transform scale-100 animate-in fade-in zoom-in-95 duration-200 text-white">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold tracking-tight">Шинэ дуу захиалах</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white rounded-lg p-1 hover:bg-slate-800 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSend} className="flex flex-col gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Тайлбар</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-white placeholder-gray-600"
                  placeholder="Жишээ нь: Надад таалагддаг гоё дуу"
                />
              </div>

              {/* YouTube Search */}
              <div ref={dropdownRef} className="relative">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2c-.3-1-1-1.8-2-2.1C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.5.6c-1 .3-1.8 1-2.1 2.1C0 8.1 0 12 0 12s0 3.9.4 5.8c.3 1 1 1.8 2.1 2.1 1.9.6 9.5.6 9.5.6s7.6 0 9.5-.6c1-.3 1.8-1 2-2.1.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.5 15.6V8.4l6.4 3.6-6.4 3.6z"/></svg>
                    YouTube-с хайх
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => { if (searchResults.length > 0 && !selectedSong) setShowResults(true); }}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-white placeholder-gray-600"
                    placeholder="Дууны нэрээ бичнэ үү..."
                  />
                  {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin block" />
                    </div>
                  )}
                  {selectedSong && !searching && (
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>

                {/* Search Results Dropdown */}
                {showResults && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl shadow-black/40 overflow-hidden z-50 max-h-[280px] overflow-y-auto" style={{ animation: 'fadeIn 0.15s ease-out' }}>
                    {searching && searchResults.length === 0 ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-gray-500 text-sm">
                        <span className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                        Хайж байна...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="py-6 text-center text-gray-500 text-sm">Илэрц олдсонгүй</div>
                    ) : (
                      searchResults.map((song) => (
                        <button
                          key={song.videoId}
                          type="button"
                          onClick={() => handleSelectSong(song)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-indigo-600/20 transition-colors text-left border-b border-slate-800/50 last:border-b-0"
                        >
                          <div className="w-14 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-800 relative">
                            {song.thumbnail && <img src={song.thumbnail} alt="" className="w-full h-full object-cover" />}
                            {song.duration && (
                              <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-[9px] text-white px-1 rounded font-medium">{song.duration}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate">{song.title}</p>
                            <p className="text-[11px] text-gray-500 truncate">{song.channel}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Selected Song Preview or Manual URL */}
              {selectedSong ? (
                <div className="flex items-center gap-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-800">
                    {selectedSong.thumbnail && <img src={selectedSong.thumbnail} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{selectedSong.title}</p>
                    <p className="text-[11px] text-indigo-400/70 truncate">{selectedSong.channel} • {selectedSong.duration}</p>
                  </div>
                  <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Эсвэл YouTube URL оруулах</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-white placeholder-gray-600"
                    placeholder="https://www.youtube.com/watch?..."
                  />
                </div>
              )}

              <input type="hidden" value={url} required />

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-3 text-sm font-medium text-gray-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 rounded-xl transition"
                >
                  Цуцлах
                </button>
                <button
                  type="submit"
                  disabled={loading || !url}
                  className="px-6 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Илгээж байна...
                    </>
                  ) : 'Захиалах'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM TOAST ALERT (Дэлгэцийн баруун дээд буланд байрлана) */}
      {alert && (
        <div className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border transition-all duration-300 animate-in fade-in slide-in-from-top-5 max-w-sm w-full ${
          alert.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200' 
            : 'bg-rose-950/90 border-rose-500/30 text-rose-200'
        }`}>
          {alert.type === 'success' ? (
            <div className="p-1 bg-emerald-500/20 rounded-full text-emerald-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="p-1 bg-rose-500/20 rounded-full text-rose-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          )}
          <p className="text-sm font-medium">{alert.message}</p>
        </div>
      )}
    </main>
  );
}
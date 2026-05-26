// app/admin/page.js
"use client";
import { useEffect, useState, useRef } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';

// Дуу тус бүрийн мөр (Sub-component)
function TrackItem({ msg, onError }) {
  const [status, setStatus] = useState('idle'); // 'idle', 'downloading', 'ready'
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const audioRef = useRef(null);

  const handleDownload = async () => {
    setStatus('downloading');
    try {
      const res = await fetch(`/api/download?url=${encodeURIComponent(msg.url)}`);
      if (!res.ok) throw new Error('Download failed');
      
      const data = await res.json();
      if (data.audioUrl) {
        setAudioUrl(data.audioUrl);
        setStatus('ready');
      } else {
        throw new Error('No audio URL found');
      }
    } catch (error) {
      console.error(error);
      onError('Линк хадгалах эсвэл хөрвүүлэхэд алдаа гарлаа. (YTDL limit эсвэл буруу линк)');
      setStatus('idle');
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-md p-5 md:p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:border-slate-700/60">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1.5">
          {/* Дуу тоглож байх үеийн неон эргэлддэг болон лугшдаг цэг */}
          {isPlaying && (
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500 animate-pulse"></span>
            </span>
          )}
          <p className={`font-semibold text-base md:text-lg tracking-tight truncate ${isPlaying ? 'text-indigo-400' : 'text-white'}`}>
            {msg.description}
          </p>
        </div>
        <a 
          href={msg.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-xs text-gray-500 hover:text-indigo-400 hover:underline break-all transition block"
        >
          {msg.url}
        </a>
      </div>

      <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
        {status === 'idle' && (
          <button 
            onClick={handleDownload}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 text-gray-200 text-sm font-medium rounded-xl hover:bg-slate-700 hover:text-white active:scale-95 transition duration-200 border border-slate-700/40"
          >
            Татах
          </button>
        )}

        {status === 'downloading' && (
          <button disabled className="w-full sm:w-auto px-5 py-2.5 bg-slate-800/40 text-gray-500 text-sm font-medium rounded-xl border border-slate-800/80 cursor-not-allowed flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-slate-600 border-t-indigo-500 rounded-full animate-spin"></span>
            Уншиж байна...
          </button>
        )}

        {status === 'ready' && (
          <>
            <button 
              onClick={togglePlay}
              className={`w-full sm:w-auto px-5 py-2.5 text-sm font-semibold rounded-xl active:scale-95 transition duration-200 flex items-center justify-center gap-2 shadow-lg ${
                isPlaying 
                  ? 'bg-rose-600 text-white shadow-rose-600/10 hover:bg-rose-500' 
                  : 'bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-500'
              }`}
            >
              {isPlaying ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Зогсоох
                </>
              ) : 'Тоглох'}
            </button>
            <audio 
              ref={audioRef} 
              src={audioUrl} 
              onEnded={() => setIsPlaying(false)} 
              className="hidden" 
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function Admin() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertMessage, setAlertMessage] = useState(null);

  const triggerError = (msg) => {
    setAlertMessage(msg);
    setTimeout(() => setAlertMessage(null), 4000); // 4 сек дараа алга болно
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMessages(data);
      } catch (error) {
        console.error("Error fetching messages: ", error);
        triggerError('Дата уншихад алдаа гарлаа.');
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, []);

  return (
    <div className="min-h-screen p-6 md:p-16 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden">
      
      {/* Арын фонны гоёл неон гэрэл */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Толгой хэсэг */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
              Захиалсан Дууны Жагсаалт
            </h1>
            <p className="text-xs md:text-sm text-gray-400 mt-1">Хэрэглэгчдээс ирсэн дууны хүсэлтүүд</p>
          </div>
          <div className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider">
            Админ хандалт
          </div>
        </div>
        
        {/* Уншиж байх үеийн скелетон / текст */}
        {loading ? (
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="h-20 bg-slate-800/40 rounded-2xl"></div>
            <div className="h-20 bg-slate-800/40 rounded-2xl"></div>
            <div className="h-20 bg-slate-800/40 rounded-2xl"></div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg) => (
              <TrackItem key={msg.id} msg={msg} onError={triggerError} />
            ))}
            
            {messages.length === 0 && (
              <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl">
                <p className="text-gray-500 text-lg">Одоогоор ямар нэгэн захиалга ирээгүй байна. 📭</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CUSTOM TOAST ALERT (Татах үед алдаа заавал баруун дээд буланд гарна) */}
      {alertMessage && (
        <div className="fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border bg-rose-950/90 border-rose-500/30 text-rose-200 transition-all duration-300 animate-in fade-in slide-in-from-top-5 max-w-sm w-full">
          <div className="p-1 bg-rose-500/20 rounded-full text-rose-400 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm font-medium">{alertMessage}</p>
        </div>
      )}
    </div>
  );
}
// app/admin/page.js
"use client";
import { useEffect, useState, useRef } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import YouTube from 'react-youtube';

// YouTube URL-аас Видео ID-г салгаж авах туслах функц
function getYouTubeId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// app/admin/page.js доторх TrackItem компонент хэсэг

function TrackItem({ msg, currentPlayingId, setCurrentPlayingId }) {
  const [player, setPlayer] = useState(null);
  const videoId = getYouTubeId(msg.url);
  const isPlaying = currentPlayingId === msg.id;

  // Тоглуулагч бэлэн болсон бөгөөд "play/pause" дарах үед л ажиллана
  useEffect(() => {
    if (player) {
      try {
        if (isPlaying) {
          player.playVideo();
        } else {
          player.pauseVideo();
        }
      } catch (err) {
        console.error("YouTube Player Error:", err);
      }
    }
  }, [isPlaying, player]);

  const onPlayerReady = (event) => {
    setPlayer(event.target);
  };

  const togglePlay = () => {
    if (!videoId) {
      alert('Энэ YouTube линк буруу байна.');
      return;
    }

    // Хэрэв тоглуулагч хараахан ачаалж дуусаагүй байвал хүлээлгэнэ
    if (!player) {
      alert('Тоглуулагч уншиж байна, түр хүлээнэ үү...');
      return;
    }

    if (isPlaying) {
      setCurrentPlayingId(null);
    } else {
      setCurrentPlayingId(msg.id);
    }
  };

  const onPlayerStateChange = (event) => {
    if (event.data === 0) { // 0 гэдэг нь дуу дууссан гэсэн үг
      setCurrentPlayingId(null);
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-md p-5 md:p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:border-slate-700/60">
      
      {/* ⚠️ ШИНЭЧЛЭГДСЭН ХЭСЭГ: hidden-ийг устгаад, DOM-д заавал уншигдахаар хийв */}
      {videoId && (
        <div className="w-0 h-0 absolute opacity-0 pointer-events-none z-[-1]">
          <YouTube
            videoId={videoId}
            opts={{
              height: '0',
              width: '0',
              playerVars: {
                autoplay: 0,
                controls: 0,
                disablekb: 1,
                fs: 0,
              },
            }}
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1.5">
          {isPlaying && (
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
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
        <button 
          onClick={togglePlay}
          className={`w-full sm:w-auto px-6 py-2.5 text-sm font-semibold rounded-xl active:scale-95 transition duration-200 flex items-center justify-center gap-2 shadow-lg ${
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
      </div>
    </div>
  );
}

export default function Admin() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPlayingId, setCurrentPlayingId] = useState(null); // Яг одоо тоглож буй дууны ID

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
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, []);

  return (
    <div className="min-h-screen p-6 md:p-16 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10">
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
        
        {loading ? (
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="h-20 bg-slate-800/40 rounded-2xl"></div>
            <div className="h-20 bg-slate-800/40 rounded-2xl"></div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg) => (
              <TrackItem 
                key={msg.id} 
                msg={msg} 
                currentPlayingId={currentPlayingId}
                setCurrentPlayingId={setCurrentPlayingId}
              />
            ))}
            
            {messages.length === 0 && (
              <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl">
                <p className="text-gray-500 text-lg">Одоогоор ямар нэгэн захиалга ирээгүй байна. 📭</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
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

function TrackItem({ msg, currentPlayingId, setCurrentPlayingId }) {
  const [player, setPlayer] = useState(null);
  const [videoInfo, setVideoInfo] = useState({ title: msg.description || "Уншиж байна...", thumbnail: "" });
  const [copied, setCopied] = useState(false);
  
  const videoId = getYouTubeId(msg.url);
  const isPlaying = currentPlayingId === msg.id;

  // 🎵 YouTube oEmbed API ашиглан дууны жинхэнэ нэр болон зургийг татах
  useEffect(() => {
    if (!msg.url) return;
    
    fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(msg.url)}&format=json`)
      .then((res) => res.json())
      .then((data) => {
        setVideoInfo({
          title: data.title,
          thumbnail: data.thumbnail_url,
        });
      })
      .catch((err) => {
        console.error("oEmbed Error:", err);
        // Хэрэв алдаа гарвал хэрэглэгчийн бичсэн тайлбарыг хэвээр үлдээнэ
        setVideoInfo({ title: msg.description || "Дууны нэр олдсонгүй", thumbnail: "" });
      });
  }, [msg.url, msg.description]);

  // Тоглуулагчийг удирдах хэсэг
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
    if (!player) {
      alert('Тоглуулагч бэлдэж байна, түр хүлээнэ үү...');
      return;
    }

    if (isPlaying) {
      setCurrentPlayingId(null);
    } else {
      setCurrentPlayingId(msg.id);
    }
  };

  // 📋 Линк хуулж авах функц
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(msg.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // 2 сек дараа буцаад хэвийн болно
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-md p-4 md:p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:border-slate-700/60">
      
      {/* Далд байгаа YouTube тоглуулагч */}
      {videoId && (
        <div className="w-0 h-0 absolute opacity-0 pointer-events-none z-[-1]">
          <YouTube
            videoId={videoId}
            opts={{
              height: '0',
              width: '0',
              playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0 },
            }}
            onReady={onPlayerReady}
            onStateChange={(e) => e.data === 0 && setCurrentPlayingId(null)}
          />
        </div>
      )}

      {/* Зүүн тал: Дууны зураг болон мэдээлэл */}
      <div className="flex items-center gap-4 w-full sm:w-auto min-w-0">
        {/* Дууны Thumbnail зураг */}
        <div className="w-16 h-16 bg-slate-800 rounded-xl overflow-hidden shrink-0 relative border border-slate-700/30 flex items-center justify-center">
          {videoInfo.thumbnail ? (
            <img src={videoInfo.thumbnail} alt="thumbnail" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-6 h-6 text-slate-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
          )}
          
          {/* Дуу явж байх үед зурган дээр давхарлаж харагдах жижиг эффект */}
          {isPlaying && (
            <div className="absolute inset-0 bg-indigo-950/40 backdrop-blur-[1px] flex items-center justify-center">
              <div className="flex gap-0.5 items-end h-4">
                <div className="w-0.5 bg-indigo-400 animate-[bounce_1s_infinite_100ms]" style={{ height: '60%' }}></div>
                <div className="w-0.5 bg-indigo-400 animate-[bounce_1s_infinite_300ms]" style={{ height: '100%' }}></div>
                <div className="w-0.5 bg-indigo-400 animate-[bounce_1s_infinite_200ms]" style={{ height: '40%' }}></div>
              </div>
            </div>
          )}
        </div>

        {/* Текст мэдээллүүд */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isPlaying && (
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0" />
            )}
            <h3 className={`font-bold text-sm md:text-base tracking-tight truncate ${isPlaying ? 'text-indigo-400' : 'text-white'}`}>
              {videoInfo.title}
            </h3>
          </div>
          
          {/* Хэрэглэгчийн үлдээсэн тайлбар */}
          {msg.description && msg.description !== videoInfo.title && (
            <p className="text-xs text-gray-400 truncate mb-1">💬 Захиалагчийн тайлбар: {msg.description}</p>
          )}

          <a 
            href={msg.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-[11px] text-gray-500 hover:text-indigo-400 hover:underline break-all transition block truncate max-w-xs md:max-w-md"
          >
            {msg.url}
          </a>
        </div>
      </div>

      {/* Баруун тал: Үйлдэл хийх товчлуурууд */}
      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end sm:border-l sm:border-slate-800 sm:pl-4">
        
        {/* Copy URL Товчлуур */}
        <button
          onClick={handleCopy}
          className={`p-2.5 rounded-xl border text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
            copied 
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
              : 'bg-slate-800/50 border-slate-700/40 text-gray-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Линкийг хуулах"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className="sm:inline">Хуулагдлаа!</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              <span className="hidden md:inline">Линк хуулах</span>
            </>
          )}
        </button>

        {/* Тоглох / Зогсоох Товчлуур */}
        <button 
          onClick={togglePlay}
          className={`px-5 py-2.5 text-xs md:text-sm font-semibold rounded-xl active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg min-w-[90px] ${
            isPlaying 
              ? 'bg-rose-600 text-white shadow-rose-600/10 hover:bg-rose-500' 
              : 'bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-500'
          }`}
        >
          {isPlaying ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
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
  const [currentPlayingId, setCurrentPlayingId] = useState(null);

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
    <div className="min-h-screen p-4 md:p-16 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden">
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
            <div className="h-24 bg-slate-800/40 rounded-2xl"></div>
            <div className="h-24 bg-slate-800/40 rounded-2xl"></div>
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
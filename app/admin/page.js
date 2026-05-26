// app/admin/page.js
"use client";
import { useEffect, useState, useRef } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';

// Extract into a sub-component to handle individual track state
function TrackItem({ msg }) {
  const [status, setStatus] = useState('idle'); // 'idle', 'downloading', 'ready'
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const audioRef = useRef(null);

  const handleDownload = async () => {
    setStatus('downloading');
    try {
      // Calls our Next.js API route (created in the next step)
      const res = await fetch(`/api/download?url=${encodeURIComponent(msg.url)}`);
      const data = await res.json();
      
      if (data.audioUrl) {
        setAudioUrl(data.audioUrl);
        setStatus('ready');
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error(error);
      alert('Татах үед алдаа гарлаа (Download failed)');
      setStatus('idle');
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
      <div className="flex-1 pr-4">
        <p className="font-semibold text-lg text-gray-800 mb-1 flex items-center gap-2">
          {/* Spinning indicator when playing */}
          {isPlaying && (
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500 animate-spin"></span>
            </span>
          )}
          {msg.description}
        </p>
        <a 
          href={msg.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-sm text-blue-500 hover:underline break-all"
        >
          {msg.url}
        </a>
      </div>

      <div className="flex gap-3">
        {status === 'idle' && (
          <button 
            onClick={handleDownload}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium transition"
          >
            Татах (Download)
          </button>
        )}

        {status === 'downloading' && (
          <button disabled className="px-4 py-2 bg-gray-50 text-gray-400 rounded-md font-medium cursor-not-allowed flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin"></span>
            Уншиж байна...
          </button>
        )}

        {status === 'ready' && (
          <>
            <button 
              onClick={togglePlay}
              className={`px-4 py-2 text-white font-medium rounded-md transition ${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isPlaying ? 'Зогсоох (Pause)' : 'Тоглох (Play)'}
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
    <div className="min-h-screen p-8 md:p-16 bg-gray-50 text-gray-900">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Дууны жагсаалт</h1>
        
        {loading ? (
          <p className="text-gray-500 text-lg">Уншиж байна...</p>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg) => (
              <TrackItem key={msg.id} msg={msg} />
            ))}
            
            {messages.length === 0 && (
              <p className="text-gray-500">Хоосон байна.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
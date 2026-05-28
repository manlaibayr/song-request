"use client";
import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, deleteDoc, doc, writeBatch, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import YouTube from 'react-youtube';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function getYouTubeId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url?.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function DragHandle(props) {
  return (
    <div {...props} className="flex flex-col gap-[3px] px-1 cursor-grab active:cursor-grabbing shrink-0 touch-none">
      {[0,1,2,3,4,5].map(i => (
        <span key={i} className={`block w-1 h-1 rounded-full bg-slate-600 ${i % 2 !== 0 ? 'ml-1.5' : ''}`} />
      ))}
    </div>
  );
}

// Now Playing bar — YouTube player энд байна
function NowPlayingBar({ current, videoId, onPrev, onNext, onStop, hasPrev, hasNext }) {
  if (!current) return null;

  return (
    <div className="sticky top-0 z-30 mb-6 bg-slate-950/80 backdrop-blur-xl border border-indigo-500/30 rounded-2xl px-4 py-3 flex items-center gap-4 shadow-xl shadow-indigo-500/10 overflow-hidden">

      {/* Hidden YouTube player — энд л тоглоно */}
      {videoId && (
        <div className="absolute w-0 h-0 opacity-0 pointer-events-none">
          <YouTube
            key={videoId}
            videoId={videoId}
            opts={{ height: '1', width: '1', playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0 } }}
            onReady={e => { try { e.target.playVideo(); } catch (_) {} }}
            onStateChange={e => {
              if (e.data === 0) hasNext ? onNext() : onStop();
            }}
          />
        </div>
      )}

      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />

      {current.thumbnail ? (
        <img src={current.thumbnail} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0 border border-indigo-500/20" />
      ) : (
        <div className="w-10 h-10 rounded-xl bg-indigo-900/40 border border-indigo-500/20 shrink-0 flex items-center justify-center">
          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
          </svg>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Одоо тоглож байна</p>
        <p className="text-sm font-semibold text-white truncate">{current.title}</p>
        {current.description && <p className="text-xs text-gray-500 truncate">💬 {current.description}</p>}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onPrev} disabled={!hasPrev} title="Өмнөх"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:cursor-not-allowed transition-all">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
        </button>

        <button onClick={onStop} title="Зогсоох"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-lg shadow-rose-600/20">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
        </button>

        <button onClick={onNext} disabled={!hasNext} title="Дараагийнх"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:cursor-not-allowed transition-all">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zm2.5-6 5.5 3.9V8.1L8.5 12zM16 6h2v12h-2z"/></svg>
        </button>
      </div>
    </div>
  );
}

function TrackItem({ msg, isNext, queueNumber, onPlayById, onDelete, dragHandleProps, isDragging }) {
  const [videoInfo, setVideoInfo] = useState({ title: msg.description || "Уншиж байна...", thumbnail: "" });
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const videoId = getYouTubeId(msg.url);

  useEffect(() => {
    if (!videoId) {
      setVideoInfo({ title: msg.description || "Буруу YouTube линк", thumbnail: "" });
      return;
    }
    fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(msg.url)}&format=json`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setVideoInfo({ title: d.title, thumbnail: d.thumbnail_url }))
      .catch(() => setVideoInfo({ title: msg.description || "Дооны нэр олдсонгүй", thumbnail: "" }));
  }, [msg.url, msg.description, videoId]);

  const handleDelete = async () => {
    if (!confirm('Энэ дууг жагсаалтаас устгах уу?')) return;
    setDeleting(true);
    try { await deleteDoc(doc(db, 'messages', msg.id)); }
    catch (err) { console.error(err); setDeleting(false); }
  };

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(msg.url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch (_) {}
  };

  return (
    <div className={`group relative backdrop-blur-md p-4 rounded-2xl border flex flex-row items-center gap-3 transition-all duration-200 ${
      isDragging ? 'opacity-40 scale-[0.98]' : ''
    } ${isNext ? 'bg-slate-900/60 border-emerald-500/30' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700/60'}`}>

      <DragHandle {...dragHandleProps} />

      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
        isNext ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400' : 'bg-slate-800/60 border-slate-700/40 text-gray-500'
      }`}>
        {queueNumber}
      </div>

      <div className="w-12 h-12 bg-slate-800 rounded-xl overflow-hidden shrink-0 relative border border-slate-700/30 flex items-center justify-center">
        {videoInfo.thumbnail
          ? <img src={videoInfo.thumbnail} alt="" className="w-full h-full object-cover" />
          : <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" /></svg>
        }
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          {isNext && <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">Дараагийнх</span>}
          <h3 className="font-bold text-sm text-white truncate">{videoInfo.title}</h3>
        </div>
        {msg.description && msg.description !== videoInfo.title && (
          <p className="text-xs text-gray-400 truncate">💬 {msg.description}</p>
        )}
        <a href={msg.url} target="_blank" rel="noopener noreferrer"
          className="text-[11px] text-gray-600 hover:text-indigo-400 transition block truncate max-w-xs">{msg.url}</a>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <a href={`/api/download?url=${encodeURIComponent(msg.url)}`} download
          className="p-2 rounded-xl border text-xs transition-all flex items-center bg-slate-800/50 border-slate-700/40 text-gray-400 hover:text-white hover:bg-slate-800" title="MP3 татах">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        </a>

        <button onClick={handleCopy}
          className={`p-2 rounded-xl border text-xs transition-all flex items-center ${
            copied ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                   : 'bg-slate-800/50 border-slate-700/40 text-gray-400 hover:text-white hover:bg-slate-800'
          }`}>
          {copied
            ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
          }
        </button>

        <button onClick={() => onPlayById(msg.id, videoInfo)}
          className="px-3 py-2 text-xs font-semibold rounded-xl active:scale-95 transition-all text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg">
          Тоглох
        </button>

        <button onClick={handleDelete} disabled={deleting}
          className="p-2 rounded-xl border text-xs transition-all flex items-center bg-slate-800/50 border-slate-700/40 text-gray-400 hover:text-rose-400 hover:bg-rose-950/30 hover:border-rose-500/30 disabled:opacity-40">
          {deleting
            ? <span className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
            : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          }
        </button>
      </div>
    </div>
  );
}

function SortableTrackItem({ msg, index, onPlayById, onStop }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: msg.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} {...attributes}>
      <TrackItem
        msg={msg}
        isNext={index === 0}
        queueNumber={index + 1}
        onPlayById={onPlayById}
        onStop={onStop}
        dragHandleProps={listeners}
        isDragging={isDragging}
      />
    </div>
  );
}

export default function Admin() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPlayingId, setCurrentPlayingId] = useState(null);
  const [nowPlayingInfo, setNowPlayingInfo] = useState(null);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'asc'));
    const unsub1 = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => {
        const ao = typeof a.order === 'number' ? a.order : (a.createdAt?.seconds ?? 0);
        const bo = typeof b.order === 'number' ? b.order : (b.createdAt?.seconds ?? 0);
        return ao - bo;
      });
      setMessages(data);
      setLoading(false);
    }, err => { console.error(err); setLoading(false); });

    const unsub2 = onSnapshot(doc(db, 'status', 'nowPlaying'), snap => {
      setNowPlayingInfo(snap.exists() ? snap.data() : null);
    });

    return () => { unsub1(); unsub2(); };
  }, []);

  const handlePlayById = async (id, videoInfo) => {
    setCurrentPlayingId(id);
    if (videoInfo) {
      const msg = messages.find(m => m.id === id);
      try {
        await setDoc(doc(db, 'status', 'nowPlaying'), {
          id,
          title: videoInfo.title,
          thumbnail: videoInfo.thumbnail,
          url: msg?.url || '',
          description: msg?.description || '',
        });
      } catch (err) { console.error(err); }
    }
  };

  const handleStop = async () => {
    setCurrentPlayingId(null);
    setNowPlayingInfo(null);
    try { await deleteDoc(doc(db, 'status', 'nowPlaying')); } catch (_) {}
  };

  const currentIndex = messages.findIndex(m => m.id === currentPlayingId);

  const handleNext = () => {
    if (currentIndex >= 0 && currentIndex < messages.length - 1) {
      const next = messages[currentIndex + 1];
      handlePlayById(next.id, null); // videoInfo will come from oEmbed via Firestore sync
    } else {
      handleStop();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prev = messages[currentIndex - 1];
      handlePlayById(prev.id, null);
    }
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIdx = queue.findIndex(m => m.id === active.id);
    const newIdx = queue.findIndex(m => m.id === over.id);
    const reorderedQueue = arrayMove(queue, oldIdx, newIdx);
    const playingMsg = messages.find(m => m.id === currentPlayingId);
    const merged = playingMsg ? [playingMsg, ...reorderedQueue] : reorderedQueue;
    setMessages(merged);
    try {
      const batch = writeBatch(db);
      merged.forEach((m, i) => batch.update(doc(db, 'messages', m.id), { order: i * 1000 }));
      await batch.commit();
    } catch (err) {
      console.error('Reorder failed:', err);
      setMessages(messages);
    }
  };

  const queue = messages.filter(m => m.id !== currentPlayingId);
  const activeMsg = queue.find(m => m.id === activeId);
  const playingMsg = messages.find(m => m.id === currentPlayingId);
  const playingVideoId = playingMsg ? getYouTubeId(playingMsg.url) : null;

  return (
    <div className="min-h-screen p-4 md:p-16 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
              Захиалсан Дууны Жагсаалт
            </h1>
            <p className="text-xs md:text-sm text-gray-400 mt-1">{messages.length > 0 ? `Нийт ${messages.length} дуу` : 'Хэрэглэгчдээс ирсэн дууны хүсэлтүүд'}</p>
          </div>
          <div className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider">
            Админ хандалт
          </div>
        </div>

        <NowPlayingBar
          current={nowPlayingInfo}
          videoId={playingVideoId}
          onPrev={handlePrev}
          onNext={handleNext}
          onStop={handleStop}
          hasPrev={currentIndex > 0}
          hasNext={currentIndex >= 0 && currentIndex < messages.length - 1}
        />

        {loading ? (
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="h-20 bg-slate-800/40 rounded-2xl" />
            <div className="h-20 bg-slate-800/40 rounded-2xl" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl">
            <p className="text-gray-500 text-lg">Одоогоор ямар нэгэн захиалга ирээгүй байна. 📭</p>
          </div>
        ) : (
          <>
            {queue.length > 0 && currentPlayingId && (
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
                Дараалал — {queue.length} дуу
              </p>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter}
              onDragStart={e => setActiveId(e.active.id)}
              onDragEnd={handleDragEnd}
              onDragCancel={() => setActiveId(null)}>
              <SortableContext items={queue.map(m => m.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-3">
                  {queue.map((msg, index) => (
                    <SortableTrackItem
                      key={msg.id}
                      msg={msg}
                      index={index}
                      onPlayById={handlePlayById}
                      onStop={handleStop}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeMsg && (
                  <div className="bg-slate-800 border border-indigo-500/40 p-4 rounded-2xl flex items-center gap-3 shadow-2xl rotate-1 scale-105">
                    <DragHandle />
                    <p className="text-sm font-semibold text-white truncate max-w-xs">
                      {activeMsg.description || activeMsg.url}
                    </p>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </>
        )}
      </div>
    </div>
  );
}

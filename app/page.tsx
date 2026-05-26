"use client";
import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Custom Alert-д зориулсан state
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Алдаа болон амжилтын мэдэгдэл харуулах функц
  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert(null);
    }, 4000); // 4 секундын дараа өөрөө алга болно
  };

  const handleSend = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'messages'), {
        description,
        url,
        createdAt: serverTimestamp()
      });
      setIsOpen(false);
      setDescription('');
      setUrl('');
      showAlert('success', 'Хүсэлтийг амжилттай илгээлээ! 🎉');
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
        <p className="text-gray-400 text-sm mb-8">
          Сонсохыг хүссэн дууныхаа YouTube линкийг тайлбартай нь хамт илгээнэ үү.
        </p>
        
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
              
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">YouTube URL Линкт</label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-white placeholder-gray-600"
                  placeholder="https://www.youtube.com/watch?..."
                />
              </div>

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
                  disabled={loading}
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
// app/api/download/route.js
import { NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url || !ytdl.validateURL(url)) {
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
  }

  try {
    // Хөтчийн хандалтыг дуурайх Agent үүсгэх
    const agent = ytdl.createAgent([
      {
        identifier: 'chrome',
        options: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
          }
        }
      }
    ]);

    // getInfo функц руу agent болон тодорхой client-уудыг дамжуулах
    const info = await ytdl.getInfo(url, { 
      agent,
      // WEB_CREATOR эсвэл TV_EMBED клиентүүд нь IP хаалтыг тойроход тусалдаг
      client: 'WEB_CREATOR' 
    });
    
    // Аудио форматуудыг шүүх
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    
    // Хамгийн боломжит аудиог сонгох
    const bestAudio = audioFormats.find(f => f.container === 'mp4') || audioFormats[0];

    if (!bestAudio || !bestAudio.url) {
      // Хэрэв олдохгүй бол арай уян хатан хайлт хийх
      const anyAudio = info.formats.find(f => f.hasAudio && !f.hasVideo);
      if (anyAudio && anyAudio.url) {
        return NextResponse.json({ audioUrl: anyAudio.url });
      }
      return NextResponse.json({ error: 'No audio format found' }, { status: 404 });
    }

    return NextResponse.json({ audioUrl: bestAudio.url });

  } catch (error) {
    console.error('YTDL Error:', error);
    
    // Хэрэв WEB_CREATOR дээр алдаа заавал IOS эсвэл ANDROID клиентээр дахин оролдож үзэх backup
    try {
      const fallbackInfo = await ytdl.getInfo(url, { client: 'ANDROID' });
      const fallbackAudio = ytdl.filterFormats(fallbackInfo.formats, 'audioonly')[0];
      if (fallbackAudio && fallbackAudio.url) {
        return NextResponse.json({ audioUrl: fallbackAudio.url });
      }
    } catch (fallbackError) {
      console.error('Fallback failed too:', fallbackError);
    }

    return NextResponse.json({ error: error.message || 'Failed to process video' }, { status: 500 });
  }
}
// app/api/download/route.js
import { NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

export async function GET(request) {
  // Extract the YouTube URL from the query string
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url || !ytdl.validateURL(url)) {
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
  }

  try {
    // Get the audio formats available for this video
    const info = await ytdl.getInfo(url);
    
    // Filter for audio-only formats, preferring the highest quality mp4/m4a format
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    const bestAudio = audioFormats.find(f => f.container === 'mp4') || audioFormats[0];

    if (!bestAudio) {
      return NextResponse.json({ error: 'No audio format found' }, { status: 404 });
    }

    // Return the direct streaming URL to the frontend
    // This allows the HTML <audio> tag to play it directly without storing a massive file on Vercel
    return NextResponse.json({ audioUrl: bestAudio.url });

  } catch (error) {
    console.error('YTDL Error:', error);
    return NextResponse.json({ error: 'Failed to process video' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';

// Curated list of high-reliability, public Cobalt instances with active YouTube support
const COBALT_INSTANCES = [
  'https://apicobalt.mgytr.top/',
  'https://melon.clxxped.lol/',
  'https://subito-c.meowing.de/',
  'https://lime.clxxped.lol/',
  'https://grapefruit.clxxped.lol/',
  'https://nuko-c.meowing.de/'
];

function cleanYouTubeUrl(url) {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (!match) return url;
  return `https://www.youtube.com/watch?v=${match[1]}`;
}

function isValidYouTubeUrl(url) {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(url);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url || !isValidYouTubeUrl(url)) {
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
  }

  const cleanUrl = cleanYouTubeUrl(url);

  let downloadData = null;
  let successInstance = null;

  // Try instances sequentially in case of rate limits or temporary downtime
  for (const instance of COBALT_INSTANCES) {
    try {
      const res = await fetch(instance, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: cleanUrl,
          downloadMode: 'audio',
          audioFormat: 'mp3',
          audioBitrate: '128'
        }),
        signal: AbortSignal.timeout(4000) // 4 seconds timeout per instance
      });

      if (!res.ok) continue;

      const data = await res.json();
      if (data && data.status !== 'error' && data.url) {
        downloadData = data;
        successInstance = instance;
        break;
      }
    } catch (err) {
      console.warn(`Cobalt instance ${instance} failed:`, err.message);
    }
  }

  if (!downloadData || !downloadData.url) {
    return NextResponse.json({ error: 'All download backends failed. Please try again later.' }, { status: 500 });
  }

  try {
    // Proxy the stream from the Cobalt tunnel directly to the user
    const fileRes = await fetch(downloadData.url);
    if (!fileRes.ok) throw new Error('Failed to fetch file stream from download tunnel');

    const filename = downloadData.filename || 'download.mp3';
    const utf8Filename = encodeURIComponent(filename);

    const headers = {
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `attachment; filename="${utf8Filename}"; filename*=UTF-8''${utf8Filename}`,
      'Cache-Control': 'no-store, max-age=0'
    };

    const contentLength = fileRes.headers.get('content-length');
    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }

    return new Response(fileRes.body, { headers });


  } catch (error) {
    console.error('Download stream proxying failed:', error.message);
    return NextResponse.json({ error: 'Failed to download the audio stream' }, { status: 500 });
  }
}

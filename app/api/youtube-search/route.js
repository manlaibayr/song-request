import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAQ%3D%3D`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      }
    );

    if (!res.ok) throw new Error('YouTube fetch failed');

    const html = await res.text();

    // Extract ytInitialData JSON from the HTML
    const dataMatch = html.match(/var ytInitialData = ({.*?});<\/script>/s);
    if (!dataMatch) {
      return NextResponse.json({ results: [] });
    }

    const data = JSON.parse(dataMatch[1]);

    // Navigate to video renderer items
    const contents =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];

    const results = [];

    for (const item of contents) {
      const video = item.videoRenderer;
      if (!video) continue;

      results.push({
        videoId: video.videoId,
        title: video.title?.runs?.[0]?.text || '',
        thumbnail: video.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || '',
        channel: video.ownerText?.runs?.[0]?.text || '',
        duration: video.lengthText?.simpleText || '',
        url: `https://www.youtube.com/watch?v=${video.videoId}`,
      });

      if (results.length >= 6) break;
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error('YouTube search error:', err);
    return NextResponse.json({ results: [], error: 'Search failed' }, { status: 500 });
  }
}

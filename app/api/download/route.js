import { spawn } from 'child_process';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { stat, unlink } from 'fs/promises';
import { createReadStream } from 'fs';
import { Readable } from 'stream';

// webpack bundler-аас гадуур runtime дээр шууд зам тогтооно
const ytDlpBin = join(process.cwd(), 'node_modules/youtube-dl-exec/bin/yt-dlp');
const ffmpegBin = join(process.cwd(), 'node_modules/ffmpeg-static/ffmpeg');

function cleanYouTubeUrl(url) {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (!match) return url;
  return `https://www.youtube.com/watch?v=${match[1]}`;
}

function isValidYouTubeUrl(url) {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(url);
}

function run(bin, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args);
    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', (d) => (stdout += d));
    proc.stderr?.on('data', (d) => (stderr += d));
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `exit code ${code}`));
    });
    proc.on('error', reject);
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url || !isValidYouTubeUrl(url)) {
    return Response.json({ error: 'Invalid YouTube URL' }, { status: 400 });
  }

  const cleanUrl = cleanYouTubeUrl(url);
  const tmpPath = `/tmp/${randomUUID()}.mp3`;

  try {
    // Title fetch болон download-г дараалан хийнэ (parallel хийхэд race condition гарна)
    const titleRaw = await run(ytDlpBin, ['--get-title', '--no-playlist', cleanUrl]).catch(() => '');
    const title = titleRaw.split('\n').pop().replace(/[<>:"/\\|?*]/g, '').trim() || 'audio';

    await run(ytDlpBin, [
      '--no-playlist',
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '192K',
      '--ffmpeg-location', ffmpegBin,
      '-o', tmpPath,
      cleanUrl,
    ]);

    const { size } = await stat(tmpPath);
    const fileStream = createReadStream(tmpPath);
    fileStream.on('close', () => unlink(tmpPath).catch(() => {}));

    return new Response(Readable.toWeb(fileStream), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${title}.mp3"`,
        'Content-Length': size.toString(),
      },
    });
  } catch (error) {
    console.error('Download failed:', error.message);
    unlink(tmpPath).catch(() => {});
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Latest videos from the operator's YouTube channel (AI Native), pulled from
 * the public RSS feed — no API key. Parsed with regex (the feed shape is
 * stable Atom); any fetch/parse failure returns [] so the blog never breaks.
 */

const CHANNEL_ID = "UCqEI873ZwxhvjpEZHqw0kIw"; // youtube.com/@AINative-i9i
export const CHANNEL_URL = "https://www.youtube.com/@AINative-i9i";
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

export interface ChannelVideo {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  publishedAt: string; // ISO
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export async function getChannelVideos(limit = 4): Promise<ChannelVideo[]> {
  try {
    const res = await fetch(FEED_URL, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const xml = await res.text();

    const videos: ChannelVideo[] = [];
    const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
    let m: RegExpExecArray | null;
    while ((m = entryRe.exec(xml)) && videos.length < limit) {
      const entry = m[1];
      const id = entry.match(/<yt:videoId>([\w-]+)<\/yt:videoId>/)?.[1];
      const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1];
      const published = entry.match(/<published>([^<]+)<\/published>/)?.[1];
      if (!id || !title) continue;
      videos.push({
        id,
        title: decodeEntities(title.trim()),
        url: `https://www.youtube.com/watch?v=${id}`,
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        publishedAt: published ?? "",
      });
    }
    return videos;
  } catch {
    return [];
  }
}

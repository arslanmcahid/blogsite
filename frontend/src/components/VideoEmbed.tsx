import { youtubeId } from "@/lib/video";

/** Gizlilik dostu (youtube-nocookie) YouTube gömmesi. Geçersiz adreste hiçbir şey göstermez. */
export function VideoEmbed({ url }: { url: string }) {
  const id = youtubeId(url);
  if (!id) return null;
  return (
    <div className="block-video">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}`}
        title="YouTube videosu"
        loading="lazy"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

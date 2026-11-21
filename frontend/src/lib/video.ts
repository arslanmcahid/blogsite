/** YouTube adresinden 11 karakterlik video kimliğini çıkarır (geçersizse null). */
export function youtubeId(url: string): string | null {
  const m = url.trim().match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})(?:[&?#].*)?$/);
  return m ? m[1] : null;
}

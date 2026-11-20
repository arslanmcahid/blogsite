/** Next'in bazen yüzde-kodlu verdiği unicode slug'ları çözer. */
export function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

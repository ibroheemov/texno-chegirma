export function productImages(p: { imageUrl: string | null; images: unknown }): string[] {
  if (Array.isArray(p.images) && p.images.length) {
    return p.images.filter((u): u is string => typeof u === "string");
  }
  return p.imageUrl ? [p.imageUrl] : [];
}

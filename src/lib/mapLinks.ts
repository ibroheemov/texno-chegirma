// Deep links that open a coordinate pair in the Yandex / Google Maps apps or sites.
export function yandexMapsUrl(lat: number, lng: number) {
  return `https://yandex.com/maps/?pt=${lng},${lat}&z=17&l=map`;
}

export function googleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

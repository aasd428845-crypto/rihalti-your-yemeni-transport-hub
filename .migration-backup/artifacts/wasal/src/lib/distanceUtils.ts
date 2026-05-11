/**
 * Haversine formula — returns straight-line distance in kilometers
 * between two geographic coordinates.
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate delivery fee based on distance.
 * @param restaurantLat  Restaurant latitude
 * @param restaurantLng  Restaurant longitude
 * @param customerLat    Customer latitude
 * @param customerLng    Customer longitude
 * @param pricePerKm     Price per kilometer (in local currency)
 * @param minFee         Minimum delivery fee
 * @returns              Computed delivery fee (rounded up to nearest integer)
 */
export function calcDistanceDeliveryFee(
  restaurantLat: number, restaurantLng: number,
  customerLat: number, customerLng: number,
  pricePerKm: number,
  minFee = 0
): { fee: number; distanceKm: number } {
  const distanceKm = haversineDistance(restaurantLat, restaurantLng, customerLat, customerLng);
  const raw = distanceKm * pricePerKm;
  const fee = Math.max(minFee, Math.ceil(raw));
  return { fee, distanceKm };
}

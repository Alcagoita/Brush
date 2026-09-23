type LegacyPlace = {
  osmId: string;
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  brand?: string;
};

type NearbyRequest = { key: string; type: string; attribute?: { values: string[] } };

/** Keep older proximity fixtures while routing their answers through Brush's API. */
export async function cloudflareViaLegacyOsm(
  mockSearch: jest.Mock,
  args: [number, number, number, NearbyRequest[]],
) {
  const [lat, lng, radius, requests] = args;
  const byType = await mockSearch(lat, lng, requests.map(request => request.type), radius) as Record<string, LegacyPlace[]> | undefined;
  if (!byType) throw new Error('No mocked POI response');
  return {
    results: Object.fromEntries(requests.map(request => [
      request.key,
      (byType[request.type] ?? [])
        .filter(place => !request.attribute || request.attribute.values.some(value =>
          `${place.osmId} ${place.name}`.toLowerCase().includes(value.toLowerCase())))
        .map(place => ({
          poi_id: place.osmId,
          name: place.name,
          lat: place.lat,
          lng: place.lng,
          distanceMeters: place.distanceMeters,
          primary_poi_type: request.type,
          brand: place.brand ?? null,
          attributes: {},
        })),
    ])),
  };
}

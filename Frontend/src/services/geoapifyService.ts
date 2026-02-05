// Use getEnvVar helper to support both Vite and Jest environments
import { getEnvVar } from '../utils/env';

// Get API key lazily to avoid warnings at module load time
// Vite needs to be restarted to pick up new env variables
const getGeoapifyApiKey = (): string => {
  return getEnvVar('VITE_GEOAPIFY_API_KEY', '');
};

export interface GeocodeResult {
  lat: number;
  lng: number;
  formatted: string;
  city?: string;
  country?: string;
  address_line1?: string;
  address_line2?: string;
  postcode?: string;
}

export interface RouteResult {
  distance: number; // in meters
  duration: number; // in seconds
  geometry: number[][]; // array of [lng, lat] coordinates
}

export interface IsodistanceResult {
  geometry: {
    type: "Polygon";
    coordinates: number[][][]; // polygon coordinates
  };
}

export class GeoapifyService {
  private apiKey: string;
  private baseUrl = "https://api.geoapify.com/v1";
  private warnedAboutMissingKey = false;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    // Only warn once if key is missing and we're not in test mode
    if (!apiKey && process.env.NODE_ENV !== "test" && !this.warnedAboutMissingKey) {
      console.info("ℹ️ VITE_GEOAPIFY_API_KEY not set - Geoapify features will be limited. Set it in your .env file and restart the dev server.");
      this.warnedAboutMissingKey = true;
    }
  }

  /**
   * Geocode: Convert address to coordinates
   * Cost: 1 credit per request
   */
  async geocode(address: string): Promise<GeocodeResult | null> {
    if (!this.apiKey) {
      console.warn("Geoapify API key not configured");
      return null;
    }

    try {
      const url = `${this.baseUrl}/geocode/search?text=${encodeURIComponent(address)}&apiKey=${this.apiKey}&limit=1`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Geocoding failed: ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [lng, lat] = feature.geometry.coordinates;
        const props = feature.properties;

        return {
          lat,
          lng,
          formatted: props.formatted,
          city: props.city,
          country: props.country,
          address_line1: props.address_line1,
          address_line2: props.address_line2,
          postcode: props.postcode,
        };
      }

      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      throw error;
    }
  }

  /**
   * Reverse Geocode: Convert coordinates to address
   * Cost: 1 credit per request
   */
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    if (!this.apiKey) {
      console.warn("Geoapify API key not configured");
      return null;
    }

    try {
      const url = `${this.baseUrl}/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Reverse geocoding failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        return data.features[0].properties.formatted;
      }

      return null;
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      throw error;
    }
  }

  /**
   * Routing: Calculate route between two points
   * Cost: 1 credit per request
   */
  async getRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number }, profile: "driving" | "walking" | "cycling" = "driving"): Promise<RouteResult | null> {
    if (!this.apiKey) {
      console.warn("Geoapify API key not configured");
      return null;
    }

    try {
      const url = `${this.baseUrl}/routing?waypoints=${from.lng},${from.lat}|${to.lng},${to.lat}&mode=${profile}&apiKey=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Routing failed: ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const properties = feature.properties;

        return {
          distance: properties.distance, // meters
          duration: properties.time, // seconds
          geometry: feature.geometry.coordinates, // [lng, lat] pairs
        };
      }

      return null;
    } catch (error) {
      console.error("Routing error:", error);
      throw error;
    }
  }

  /**
   * Isodistance: Check if point is within radius (delivery zone check)
   * Cost: Varies, but covered in free tier
   */
  async checkIsodistance(center: { lat: number; lng: number }, radiusKm: number, point: { lat: number; lng: number }): Promise<boolean> {
    if (!this.apiKey) {
      console.warn("Geoapify API key not configured, using fallback distance calculation");
      // Fallback to simple distance calculation
      const distance = this.calculateHaversineDistance(center, point);
      return distance <= radiusKm;
    }

    try {
      // Get isodistance polygon
      const url = `${this.baseUrl}/isoline?lat=${center.lat}&lon=${center.lng}&type=distance&range=${radiusKm * 1000}&apiKey=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Isodistance failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const polygon = data.features[0].geometry.coordinates[0];

        // Check if point is inside polygon (point-in-polygon algorithm)
        return this.isPointInPolygon([point.lng, point.lat], polygon);
      }

      return false;
    } catch (error) {
      console.error("Isodistance error:", error);
      // Fallback to simple distance calculation
      const distance = this.calculateHaversineDistance(center, point);
      return distance <= radiusKm;
    }
  }

  /**
   * Point-in-polygon check (for isodistance)
   */
  private isPointInPolygon(point: [number, number], polygon: number[][]): boolean {
    const [x, y] = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];

      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }

    return inside;
  }

  /**
   * Fallback: Haversine distance calculation
   */
  private calculateHaversineDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Autocomplete: Get address suggestions as user types
   */
  async autocomplete(query: string, limit: number = 5): Promise<GeocodeResult[]> {
    if (!this.apiKey) {
      console.warn("Geoapify API key not configured");
      return [];
    }

    try {
      const url = `${this.baseUrl}/geocode/autocomplete?text=${encodeURIComponent(query)}&apiKey=${this.apiKey}&limit=${limit}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Autocomplete failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.features) {
        return data.features.map((feature: any) => {
          const [lng, lat] = feature.geometry.coordinates;
          const props = feature.properties;
          return {
            lat,
            lng,
            formatted: props.formatted,
            city: props.city,
            country: props.country,
            address_line1: props.address_line1,
            address_line2: props.address_line2,
            postcode: props.postcode,
          };
        });
      }

      return [];
    } catch (error) {
      console.error("Autocomplete error:", error);
      return [];
    }
  }
}

export const geoapifyService = new GeoapifyService(getGeoapifyApiKey());

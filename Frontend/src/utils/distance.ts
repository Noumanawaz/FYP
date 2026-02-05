// Utility functions for distance calculations and location-based filtering
import { geoapifyService } from "../services/geoapifyService";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RouteInfo {
  distance: number; // in kilometers
  duration: number; // in minutes
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLng = toRadians(coord2.lng - coord1.lng);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRadians(coord1.lat)) * Math.cos(toRadians(coord2.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Filter restaurants within specified radius
 */
export function filterRestaurantsByDistance(restaurants: any[], userLocation: Coordinates, maxDistanceKm: number = 15): any[] {
  return restaurants
    .map((restaurant) => ({
      ...restaurant,
      distance: calculateDistance(userLocation, restaurant.coordinates),
    }))
    .filter((restaurant) => restaurant.distance <= maxDistanceKm)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Get delivery time estimate based on distance
 */
export function getDeliveryTimeEstimate(distanceKm: number): string {
  if (distanceKm <= 2) return "15-25 min";
  if (distanceKm <= 5) return "25-35 min";
  if (distanceKm <= 10) return "35-45 min";
  if (distanceKm <= 15) return "45-60 min";
  return "60+ min";
}

/**
 * Get delivery fee based on distance
 */
export function getDeliveryFee(distanceKm: number): number {
  if (distanceKm <= 2) return 25;
  if (distanceKm <= 5) return 35;
  if (distanceKm <= 10) return 45;
  if (distanceKm <= 15) return 55;
  return 65;
}

/**
 * Get route distance and time using Geoapify routing (actual road distance)
 * Falls back to Haversine if routing fails
 */
export async function getRouteDistance(from: Coordinates, to: Coordinates): Promise<RouteInfo | null> {
  try {
    const route = await geoapifyService.getRoute(from, to, "driving");
    if (route) {
      return {
        distance: Math.round((route.distance / 1000) * 100) / 100, // convert to km, round to 2 decimals
        duration: Math.round(route.duration / 60), // convert to minutes
      };
    }
    return null;
  } catch (error) {
    console.error("Routing error:", error);
    // Fallback to Haversine distance
    const distance = calculateDistance(from, to);
    return {
      distance,
      duration: Math.round(distance * 2), // rough estimate: 2 min per km
    };
  }
}

/**
 * Check if a point is within delivery radius using isodistance
 * Falls back to simple distance calculation if isodistance fails
 */
export async function checkDeliveryZone(restaurantLocation: Coordinates, customerLocation: Coordinates, radiusKm: number = 5): Promise<boolean> {
  try {
    return await geoapifyService.checkIsodistance(restaurantLocation, radiusKm, customerLocation);
  } catch (error) {
    console.error("Isodistance check error:", error);
    // Fallback to simple distance check
    const distance = calculateDistance(restaurantLocation, customerLocation);
    return distance <= radiusKm;
  }
}

import { RestaurantModel } from "@/models/postgres/restaurants.model";
import { LocationModel } from "@/models/postgres/locations.model";
import { CreateRestaurantDto, RestaurantLocation, PaginationQuery } from "@/types";
import { AppError } from "@/middleware/error-handler";

export class RestaurantService {
  static async getAllRestaurants(query: PaginationQuery & { status?: string; price_range?: string; categories?: string[]; search?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const result = await RestaurantModel.findAll(page, limit, {
      status: query.status,
      price_range: query.price_range,
      categories: query.categories,
      search: query.search,
    });

    return {
      restaurants: result.restaurants,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  static async getRestaurantById(restaurantId: string) {
    const restaurant = await RestaurantModel.findById(restaurantId);
    if (!restaurant) {
      throw new AppError("Restaurant not found", 404);
    }
    return restaurant;
  }

  static async getRestaurantByOwnerId(ownerId: string) {
    const restaurant = await RestaurantModel.findByOwnerId(ownerId);
    if (!restaurant) {
      throw new AppError("Restaurant not found", 404);
    }
    return restaurant;
  }

  static async searchRestaurants(keyword: string) {
    return await RestaurantModel.findByKeyword(keyword);
  }

  static async createRestaurant(data: CreateRestaurantDto) {
    return await RestaurantModel.create(data);
  }

  static async updateRestaurant(restaurantId: string, data: Partial<CreateRestaurantDto>, userId?: string, userRole?: string) {
    const restaurant = await RestaurantModel.findById(restaurantId);
    if (!restaurant) {
      throw new AppError("Restaurant not found", 404);
    }
    return await RestaurantModel.update(restaurantId, data);
  }

  static async deleteRestaurant(restaurantId: string) {
    const restaurant = await RestaurantModel.findById(restaurantId);
    if (!restaurant) {
      throw new AppError("Restaurant not found", 404);
    }
    return await RestaurantModel.delete(restaurantId);
  }

  static async getRestaurantLocations(restaurantId: string) {
    return await LocationModel.findAll(restaurantId);
  }

  static async addLocation(restaurantId: string, locationData: Omit<RestaurantLocation, "location_id" | "restaurant_id" | "created_at" | "updated_at">, userId?: string, userRole?: string) {
    const restaurant = await RestaurantModel.findById(restaurantId);
    if (!restaurant) {
      throw new AppError("Restaurant not found", 404);
    }
    return await LocationModel.create({ ...locationData, restaurant_id: restaurantId });
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check if a location is within restaurant's delivery zone
   */
  static async checkDeliveryZone(restaurantId: string, lat: number, lng: number): Promise<{ canDeliver: boolean; distance?: number; nearestLocation?: any }> {
    const restaurant = await RestaurantModel.findById(restaurantId);
    if (!restaurant) {
      throw new AppError("Restaurant not found", 404);
    }

    const locations = await LocationModel.findAll(restaurantId);
    if (locations.length === 0) {
      return { canDeliver: false };
    }

    // Check distance to nearest location
    let minDistance = Infinity;
    let nearestLocation = null;

    for (const location of locations) {
      if (location.lat && location.lng) {
        const distance = this.calculateDistance(lat, lng, location.lat, location.lng);
        if (distance < minDistance) {
          minDistance = distance;
          nearestLocation = location;
        }
      }
    }

    // Default delivery radius is 5km, but can be configured per location
    const deliveryRadius = nearestLocation?.delivery_zones?.radius || 5;
    const canDeliver = minDistance <= deliveryRadius;

    return {
      canDeliver,
      distance: Math.round(minDistance * 100) / 100,
      nearestLocation: nearestLocation
        ? {
            location_id: nearestLocation.location_id,
            address: nearestLocation.address,
            city: nearestLocation.city,
            area: nearestLocation.area,
          }
        : undefined,
    };
  }

  /**
   * Get nearby restaurants within radius
   */
  static async getNearbyRestaurants(lat: number, lng: number, radiusKm: number = 15): Promise<{ restaurants: any[]; total: number }> {
    const allRestaurants = await RestaurantModel.findActive();
    const locations = await LocationModel.findAll();

    // Group locations by restaurant
    const restaurantLocations = new Map<string, typeof locations>();
    locations.forEach((loc) => {
      if (!restaurantLocations.has(loc.restaurant_id)) {
        restaurantLocations.set(loc.restaurant_id, []);
      }
      restaurantLocations.get(loc.restaurant_id)!.push(loc);
    });

    // Calculate distances and filter
    const nearbyRestaurants = [];

    for (const restaurant of allRestaurants) {
      const locs = restaurantLocations.get(restaurant.restaurant_id) || [];

      for (const location of locs) {
        if (location.lat && location.lng && location.status === "open") {
          const distance = this.calculateDistance(lat, lng, location.lat, location.lng);

          if (distance <= radiusKm) {
            nearbyRestaurants.push({
              ...restaurant,
              location: {
                location_id: location.location_id,
                address: location.address,
                city: location.city,
                area: location.area,
                lat: location.lat,
                lng: location.lng,
              },
              distance: Math.round(distance * 100) / 100,
            });
            break; // Only add restaurant once (use nearest location)
          }
        }
      }
    }

    // Sort by distance
    nearbyRestaurants.sort((a, b) => a.distance - b.distance);

    return {
      restaurants: nearbyRestaurants,
      total: nearbyRestaurants.length,
    };
  }
}

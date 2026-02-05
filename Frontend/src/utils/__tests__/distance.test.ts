import { calculateDistance, filterRestaurantsByDistance, getDeliveryTimeEstimate, getDeliveryFee, getRouteDistance, checkDeliveryZone } from "../distance";
import { geoapifyService } from "../../services/geoapifyService";

// Mock geoapifyService
jest.mock("../../services/geoapifyService", () => ({
  geoapifyService: {
    getRoute: jest.fn(),
    checkIsodistance: jest.fn(),
  },
}));

const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

afterAll(() => {
  consoleErrorSpy.mockRestore();
  consoleWarnSpy.mockRestore();
});

describe("distance utilities - Whitebox Tests", () => {
  describe("calculateDistance", () => {
    it("should calculate distance using Haversine formula", () => {
      // Islamabad to Lahore (approximately 266-280km)
      const coord1 = { lat: 33.6844, lng: 73.0479 }; // Islamabad
      const coord2 = { lat: 31.5497, lng: 74.3436 }; // Lahore

      const distance = calculateDistance(coord1, coord2);

      expect(distance).toBeCloseTo(266.58, 1);
    });

    it("should return 0 for same coordinates", () => {
      const coord = { lat: 33.6844, lng: 73.0479 };
      const distance = calculateDistance(coord, coord);

      expect(distance).toBe(0);
    });

    it("should round to 2 decimal places", () => {
      const coord1 = { lat: 33.6844, lng: 73.0479 };
      const coord2 = { lat: 33.685, lng: 73.048 };

      const distance = calculateDistance(coord1, coord2);

      // Should be a small distance, rounded to 2 decimals
      expect(distance.toString().split(".")[1]?.length || 0).toBeLessThanOrEqual(2);
    });

    it("should handle negative coordinates", () => {
      const coord1 = { lat: -33.6844, lng: -73.0479 };
      const coord2 = { lat: -31.5497, lng: -74.3436 };

      const distance = calculateDistance(coord1, coord2);

      expect(distance).toBeGreaterThan(0);
    });

    it("should handle coordinates across equator", () => {
      const coord1 = { lat: 10, lng: 0 };
      const coord2 = { lat: -10, lng: 0 };

      const distance = calculateDistance(coord1, coord2);

      expect(distance).toBeCloseTo(2223.9, 1); // Approximately 2223-2224km
    });
  });

  describe("filterRestaurantsByDistance", () => {
    it("should filter restaurants within max distance", () => {
      const userLocation = { lat: 33.6844, lng: 73.0479 };
      const restaurants = [
        { id: "1", name: "Near", coordinates: { lat: 33.685, lng: 73.048 } },
        { id: "2", name: "Far", coordinates: { lat: 31.5497, lng: 74.3436 } },
      ];

      const filtered = filterRestaurantsByDistance(restaurants, userLocation, 5);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("1");
      expect(filtered[0].distance).toBeDefined();
    });

    it("should sort restaurants by distance", () => {
      const userLocation = { lat: 33.6844, lng: 73.0479 };
      const restaurants = [
        { id: "2", name: "Far", coordinates: { lat: 33.69, lng: 73.05 } },
        { id: "1", name: "Near", coordinates: { lat: 33.685, lng: 73.048 } },
      ];

      const filtered = filterRestaurantsByDistance(restaurants, userLocation, 10);

      expect(filtered[0].distance).toBeLessThan(filtered[1].distance);
    });

    it("should use default maxDistance of 15km", () => {
      const userLocation = { lat: 33.6844, lng: 73.0479 };
      const restaurants = [
        { id: "1", name: "Near", coordinates: { lat: 33.685, lng: 73.048 } },
        { id: "2", name: "Far", coordinates: { lat: 31.5497, lng: 74.3436 } },
      ];

      const filtered = filterRestaurantsByDistance(restaurants, userLocation);

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((r) => r.distance <= 15)).toBe(true);
    });

    it("should add distance property to restaurants", () => {
      const userLocation = { lat: 33.6844, lng: 73.0479 };
      const restaurants = [{ id: "1", name: "Restaurant", coordinates: { lat: 33.685, lng: 73.048 } }];

      const filtered = filterRestaurantsByDistance(restaurants, userLocation, 5);

      expect(filtered[0].distance).toBeDefined();
      expect(typeof filtered[0].distance).toBe("number");
    });
  });

  describe("getDeliveryTimeEstimate", () => {
    it("should return correct time for distance <= 2km", () => {
      expect(getDeliveryTimeEstimate(1)).toBe("15-25 min");
      expect(getDeliveryTimeEstimate(2)).toBe("15-25 min");
    });

    it("should return correct time for distance <= 5km", () => {
      expect(getDeliveryTimeEstimate(3)).toBe("25-35 min");
      expect(getDeliveryTimeEstimate(5)).toBe("25-35 min");
    });

    it("should return correct time for distance <= 10km", () => {
      expect(getDeliveryTimeEstimate(7)).toBe("35-45 min");
      expect(getDeliveryTimeEstimate(10)).toBe("35-45 min");
    });

    it("should return correct time for distance <= 15km", () => {
      expect(getDeliveryTimeEstimate(12)).toBe("45-60 min");
      expect(getDeliveryTimeEstimate(15)).toBe("45-60 min");
    });

    it("should return 60+ min for distance > 15km", () => {
      expect(getDeliveryTimeEstimate(20)).toBe("60+ min");
      expect(getDeliveryTimeEstimate(100)).toBe("60+ min");
    });
  });

  describe("getDeliveryFee", () => {
    it("should return correct fee for distance <= 2km", () => {
      expect(getDeliveryFee(1)).toBe(25);
      expect(getDeliveryFee(2)).toBe(25);
    });

    it("should return correct fee for distance <= 5km", () => {
      expect(getDeliveryFee(3)).toBe(35);
      expect(getDeliveryFee(5)).toBe(35);
    });

    it("should return correct fee for distance <= 10km", () => {
      expect(getDeliveryFee(7)).toBe(45);
      expect(getDeliveryFee(10)).toBe(45);
    });

    it("should return correct fee for distance <= 15km", () => {
      expect(getDeliveryFee(12)).toBe(55);
      expect(getDeliveryFee(15)).toBe(55);
    });

    it("should return correct fee for distance > 15km", () => {
      expect(getDeliveryFee(20)).toBe(65);
      expect(getDeliveryFee(100)).toBe(65);
    });
  });

  describe("getRouteDistance", () => {
    it("should return route distance and duration from API", async () => {
      (geoapifyService.getRoute as jest.Mock).mockResolvedValueOnce({
        distance: 5000, // meters
        duration: 600, // seconds
      });

      const result = await getRouteDistance({ lat: 33.6844, lng: 73.0479 }, { lat: 33.69, lng: 73.05 });

      expect(result).not.toBeNull();
      expect(result?.distance).toBe(5); // converted to km
      expect(result?.duration).toBe(10); // converted to minutes
    });

    it("should fallback to Haversine when API fails", async () => {
      (geoapifyService.getRoute as jest.Mock).mockRejectedValueOnce(new Error("API Error"));

      const result = await getRouteDistance({ lat: 33.6844, lng: 73.0479 }, { lat: 33.69, lng: 73.05 });

      expect(result).not.toBeNull();
      expect(result?.distance).toBeGreaterThan(0);
      expect(result?.duration).toBeGreaterThan(0);
    });

    it("should return null when API returns null", async () => {
      (geoapifyService.getRoute as jest.Mock).mockResolvedValueOnce(null);

      const result = await getRouteDistance({ lat: 33.6844, lng: 73.0479 }, { lat: 33.69, lng: 73.05 });

      // When API returns null (not error), function returns null
      expect(result).toBeNull();
    });

    it("should round distance to 2 decimal places", async () => {
      (geoapifyService.getRoute as jest.Mock).mockResolvedValueOnce({
        distance: 1234.567, // meters
        duration: 120,
      });

      const result = await getRouteDistance({ lat: 33.6844, lng: 73.0479 }, { lat: 33.69, lng: 73.05 });

      expect(result?.distance.toString().split(".")[1]?.length || 0).toBeLessThanOrEqual(2);
    });
  });

  describe("checkDeliveryZone", () => {
    it("should return true when point is in delivery zone", async () => {
      (geoapifyService.checkIsodistance as jest.Mock).mockResolvedValueOnce(true);

      const result = await checkDeliveryZone({ lat: 33.6844, lng: 73.0479 }, { lat: 33.685, lng: 73.048 }, 5);

      expect(result).toBe(true);
    });

    it("should return false when point is outside delivery zone", async () => {
      (geoapifyService.checkIsodistance as jest.Mock).mockResolvedValueOnce(false);

      const result = await checkDeliveryZone({ lat: 33.6844, lng: 73.0479 }, { lat: 31.5497, lng: 74.3436 }, 5);

      expect(result).toBe(false);
    });

    it("should fallback to Haversine when API fails", async () => {
      (geoapifyService.checkIsodistance as jest.Mock).mockRejectedValueOnce(new Error("API Error"));

      const result = await checkDeliveryZone({ lat: 33.6844, lng: 73.0479 }, { lat: 33.685, lng: 73.048 }, 5);

      expect(typeof result).toBe("boolean");
    });

    it("should use default radius of 5km", async () => {
      (geoapifyService.checkIsodistance as jest.Mock).mockResolvedValueOnce(true);

      await checkDeliveryZone({ lat: 33.6844, lng: 73.0479 }, { lat: 33.685, lng: 73.048 });

      expect(geoapifyService.checkIsodistance).toHaveBeenCalledWith({ lat: 33.6844, lng: 73.0479 }, 5, { lat: 33.685, lng: 73.048 });
    });
  });
});

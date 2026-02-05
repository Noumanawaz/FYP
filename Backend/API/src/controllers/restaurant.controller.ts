import { Request, Response, NextFunction } from "express";
import { RestaurantService } from "@/services/restaurant.service";
import { ApiResponse } from "@/types";
import { AuthRequest } from "@/middleware/auth";

export class RestaurantController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RestaurantService.getAllRestaurants(req.query as any);
      const response: ApiResponse = {
        success: true,
        data: result,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurant = await RestaurantService.getRestaurantById(req.params.id);
      const response: ApiResponse = {
        success: true,
        data: restaurant,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  static async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { keyword } = req.query;
      if (!keyword || typeof keyword !== "string") {
        const response: ApiResponse = {
          success: false,
          error: "Keyword is required",
        };
        res.status(400).json(response);
        return;
      }

      const restaurants = await RestaurantService.searchRestaurants(keyword);
      const response: ApiResponse = {
        success: true,
        data: restaurants,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurant = await RestaurantService.createRestaurant(req.body);
      const response: ApiResponse = {
        success: true,
        data: restaurant,
        message: "Restaurant created successfully",
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurant = await RestaurantService.updateRestaurant(req.params.id, req.body);
      const response: ApiResponse = {
        success: true,
        data: restaurant,
        message: "Restaurant updated successfully",
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await RestaurantService.deleteRestaurant(req.params.id);
      const response: ApiResponse = {
        success: true,
        message: "Restaurant deleted successfully",
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getLocations(req: Request, res: Response, next: NextFunction) {
    try {
      const locations = await RestaurantService.getRestaurantLocations(req.params.id);
      const response: ApiResponse = {
        success: true,
        data: locations,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  static async addLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const location = await RestaurantService.addLocation(req.params.id, req.body);
      const response: ApiResponse = {
        success: true,
        data: location,
        message: "Location added successfully",
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async checkDeliveryZone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { lat, lng } = req.query;

      if (!lat || !lng) {
        const response: ApiResponse = {
          success: false,
          error: "Latitude and longitude are required",
        };
        res.status(400).json(response);
        return;
      }

      const result = await RestaurantService.checkDeliveryZone(id, parseFloat(lat as string), parseFloat(lng as string));

      const response: ApiResponse = {
        success: true,
        data: result,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getNearby(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lat, lng, radius } = req.query;

      if (!lat || !lng) {
        const response: ApiResponse = {
          success: false,
          error: "Latitude and longitude are required",
        };
        res.status(400).json(response);
        return;
      }

      const result = await RestaurantService.getNearbyRestaurants(parseFloat(lat as string), parseFloat(lng as string), radius ? parseFloat(radius as string) : 15);

      const response: ApiResponse = {
        success: true,
        data: result,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getMyRestaurant(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.user_id) {
        const response: ApiResponse = {
          success: false,
          error: "Authentication required",
        };
        return res.status(401).json(response);
      }

      const restaurant = await RestaurantService.getRestaurantByOwnerId(req.user.user_id);
      const response: ApiResponse = {
        success: true,
        data: restaurant,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

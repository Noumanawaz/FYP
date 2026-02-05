import { MenuItemModel } from "@/models/postgres/menu-items.model";
import { CreateMenuItemDto, MenuItem, PaginationQuery } from "@/types";
import { AppError } from "@/middleware/error-handler";

export class MenuService {
  static async getAllMenuItems(
    query: PaginationQuery & {
      restaurant_id?: string;
      category_id?: string;
      is_available?: boolean;
      is_featured?: boolean;
      search?: string;
    }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const result = await MenuItemModel.findAll(
      {
        restaurant_id: query.restaurant_id,
        category_id: query.category_id,
        is_available: query.is_available,
        is_featured: query.is_featured,
        search: query.search,
      },
      { page, limit }
    );

    return {
      items: result.items,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  static async getMenuItemById(itemId: string) {
    const item = await MenuItemModel.findById(itemId);
    if (!item) {
      throw new AppError("Menu item not found", 404);
    }
    return item;
  }

  static async getRestaurantMenu(restaurantId: string) {
    return await MenuItemModel.findByRestaurant(restaurantId);
  }

  static async searchMenuItems(searchText: string, restaurantId?: string) {
    return await MenuItemModel.search(searchText, restaurantId);
  }

  static async createMenuItem(data: CreateMenuItemDto) {
    return await MenuItemModel.create(data);
  }

  static async updateMenuItem(itemId: string, data: Partial<CreateMenuItemDto>) {
    const item = await MenuItemModel.findById(itemId);
    if (!item) {
      throw new AppError("Menu item not found", 404);
    }
    return await MenuItemModel.update(itemId, data);
  }

  static async deleteMenuItem(itemId: string) {
    const item = await MenuItemModel.findById(itemId);
    if (!item) {
      throw new AppError("Menu item not found", 404);
    }
    return await MenuItemModel.delete(itemId);
  }
}

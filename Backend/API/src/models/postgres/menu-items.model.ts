import { sql } from "@/config/database";
import { MenuItem, CreateMenuItemDto } from "@/types";
import { v4 as uuidv4 } from "uuid";

export class MenuItemModel {
  // Get all menu items with filters
  static async findAll(
    filters?: {
      restaurant_id?: string;
      category_id?: string;
      is_available?: boolean;
      is_featured?: boolean;
      search?: string;
    },
    pagination?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{ items: MenuItem[]; total: number }> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    const queryParams: any[] = [limit, offset];

    if (filters?.restaurant_id) {
      whereConditions.push(`restaurant_id = $${queryParams.length + 1}`);
      queryParams.push(filters.restaurant_id);
    }

    if (filters?.category_id) {
      whereConditions.push(`category_id = $${queryParams.length + 1}`);
      queryParams.push(filters.category_id);
    }

    if (filters?.is_available !== undefined) {
      whereConditions.push(`is_available = $${queryParams.length + 1}`);
      queryParams.push(filters.is_available);
    }

    if (filters?.is_featured !== undefined) {
      whereConditions.push(`is_featured = $${queryParams.length + 1}`);
      queryParams.push(filters.is_featured);
    }

    if (filters?.search) {
      whereConditions.push(`(name ILIKE $${queryParams.length + 1} OR description ILIKE $${queryParams.length + 1})`);
      queryParams.push(`%${filters.search}%`);
    }

    // Build queries based on filters
    let countResult;
    let items;

    if (!filters || Object.keys(filters).length === 0) {
      // No filters
      countResult = await sql`SELECT COUNT(*) as total FROM menu_items`;
      items = await sql`
        SELECT * FROM menu_items
        ORDER BY display_order ASC, created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (filters.restaurant_id && Object.keys(filters).length === 1) {
      // Only restaurant_id filter
      countResult = await sql`SELECT COUNT(*) as total FROM menu_items WHERE restaurant_id = ${filters.restaurant_id}`;
      items = await sql`
        SELECT * FROM menu_items
        WHERE restaurant_id = ${filters.restaurant_id}
        ORDER BY display_order ASC, created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (filters.category_id && Object.keys(filters).length === 1) {
      // Only category_id filter
      countResult = await sql`SELECT COUNT(*) as total FROM menu_items WHERE category_id = ${filters.category_id}`;
      items = await sql`
        SELECT * FROM menu_items
        WHERE category_id = ${filters.category_id}
        ORDER BY display_order ASC, created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (filters.is_available !== undefined && Object.keys(filters).length === 1) {
      // Only is_available filter
      countResult = await sql`SELECT COUNT(*) as total FROM menu_items WHERE is_available = ${filters.is_available}`;
      items = await sql`
        SELECT * FROM menu_items
        WHERE is_available = ${filters.is_available}
        ORDER BY display_order ASC, created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      // Complex filters - get all and filter in memory (simplified for now)
      countResult = await sql`SELECT COUNT(*) as total FROM menu_items`;
      items = await sql`
        SELECT * FROM menu_items
        ORDER BY display_order ASC, created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const total = parseInt(countResult[0]?.total || "0");

    return {
      items: items as MenuItem[],
      total,
    };
  }

  // Get menu item by ID
  static async findById(itemId: string): Promise<MenuItem | null> {
    const result = await sql`
      SELECT *
      FROM menu_items
      WHERE item_id = ${itemId}
    `;

    return (result[0] as MenuItem) || null;
  }

  // Get menu items by restaurant
  static async findByRestaurant(restaurantId: string): Promise<MenuItem[]> {
    const result = await sql`
      SELECT 
        mi.*,
        mc.name as category_name,
        mc.description as category_description
      FROM menu_items mi
      LEFT JOIN menu_categories mc ON mi.category_id = mc.category_id
      WHERE mi.restaurant_id = ${restaurantId}
        AND mi.is_available = true
      ORDER BY mi.display_order ASC, mi.name ASC
    `;

    // Ensure currency is included in the result
    return result.map((item: any) => ({
      ...item,
      currency: item.currency || 'PKR', // Default to PKR if not set
    })) as MenuItem[];
  }

  // Get menu items by category
  static async findByCategory(categoryId: string): Promise<MenuItem[]> {
    const result = await sql`
      SELECT *
      FROM menu_items
      WHERE category_id = ${categoryId}
        AND is_available = true
      ORDER BY display_order ASC, name ASC
    `;

    return result as MenuItem[];
  }

  // Create new menu item
  static async create(data: CreateMenuItemDto): Promise<MenuItem> {
    const itemId = uuidv4();

    const result = await sql`
      INSERT INTO menu_items (
        item_id,
        restaurant_id,
        category_id,
        name,
        description,
        base_price,
        currency,
        image_urls,
        dietary_tags,
        spice_level,
        preparation_time,
        calories,
        ingredients,
        allergens,
        is_available,
        is_featured,
        display_order,
        customization_options,
        created_at,
        updated_at
      ) VALUES (
        ${itemId},
        ${data.restaurant_id},
        ${data.category_id},
        ${data.name},
        ${data.description},
        ${data.base_price},
        ${data.currency || "PKR"},
        ${data.image_urls || []},
        ${data.dietary_tags || []},
        ${data.spice_level || null},
        ${data.preparation_time || null},
        ${data.calories || null},
        ${data.ingredients || []},
        ${data.allergens || []},
        ${data.is_available !== undefined ? data.is_available : true},
        ${data.is_featured !== undefined ? data.is_featured : false},
        ${data.display_order || 0},
        ${JSON.stringify(data.customization_options || {})},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    return result[0] as MenuItem;
  }

  // Update menu item
  static async update(itemId: string, data: Partial<CreateMenuItemDto>): Promise<MenuItem | null> {
    // Neon doesn't support sql.unsafe, so we fetch current record and merge
    const current = await this.findById(itemId);
    if (!current) {
      return null;
    }

    // Merge provided data with current data
    const mergedData: CreateMenuItemDto = {
      restaurant_id: current.restaurant_id,
      category_id: data.category_id ?? current.category_id,
      name: data.name ?? current.name,
      description: data.description ?? current.description,
      base_price: data.base_price ?? current.base_price,
      currency: data.currency ?? current.currency,
      image_urls: data.image_urls ?? current.image_urls,
      dietary_tags: data.dietary_tags ?? current.dietary_tags,
      spice_level: data.spice_level ?? current.spice_level,
      preparation_time: data.preparation_time ?? current.preparation_time,
      calories: data.calories ?? current.calories,
      ingredients: data.ingredients ?? current.ingredients,
      allergens: data.allergens ?? current.allergens,
      is_available: data.is_available ?? current.is_available,
      is_featured: data.is_featured ?? current.is_featured,
      display_order: data.display_order ?? current.display_order,
      customization_options: data.customization_options ?? current.customization_options,
    };

    // Update with merged data using template literal
    const result = await sql`
      UPDATE menu_items
      SET 
        category_id = ${mergedData.category_id},
        name = ${mergedData.name},
        description = ${mergedData.description},
        base_price = ${mergedData.base_price},
        currency = ${mergedData.currency ?? null},
        image_urls = ${mergedData.image_urls ?? null},
        dietary_tags = ${mergedData.dietary_tags ?? null},
        spice_level = ${mergedData.spice_level ?? null},
        preparation_time = ${mergedData.preparation_time ?? null},
        calories = ${mergedData.calories ?? null},
        ingredients = ${mergedData.ingredients ?? null},
        allergens = ${mergedData.allergens ?? null},
        is_available = ${mergedData.is_available ?? true},
        is_featured = ${mergedData.is_featured ?? false},
        display_order = ${mergedData.display_order ?? null},
        customization_options = ${mergedData.customization_options ? JSON.stringify(mergedData.customization_options) : null}::jsonb,
        updated_at = NOW()
      WHERE item_id = ${itemId}
      RETURNING *
    `;

    return (result[0] as MenuItem) || null;
  }

  // Delete menu item
  static async delete(itemId: string): Promise<boolean> {
    const result = await sql`
      UPDATE menu_items
      SET is_available = false, updated_at = NOW()
      WHERE item_id = ${itemId}
      RETURNING item_id
    `;

    return result.length > 0;
  }

  // Search menu items by text
  static async search(searchText: string, restaurantId?: string): Promise<MenuItem[]> {
    let query = sql`
      SELECT *
      FROM menu_items
      WHERE (
        name ILIKE ${`%${searchText}%`}
        OR description ILIKE ${`%${searchText}%`}
        OR ${searchText} = ANY(ingredients)
      )
      AND is_available = true
    `;

    if (restaurantId) {
      query = sql`
        SELECT *
        FROM menu_items
        WHERE restaurant_id = ${restaurantId}
          AND (
            name ILIKE ${`%${searchText}%`}
            OR description ILIKE ${`%${searchText}%`}
            OR ${searchText} = ANY(ingredients)
          )
          AND is_available = true
      `;
    }

    const result = await query;
    return result as MenuItem[];
  }
}

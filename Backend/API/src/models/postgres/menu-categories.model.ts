import { sql } from "@/config/database";
import { MenuCategory, CreateMenuCategoryDto, UpdateMenuCategoryDto } from "@/types";
import { v4 as uuidv4 } from "uuid";

export class MenuCategoryModel {
  // Get all menu categories with filters
  static async findAll(
    filters?: {
      restaurant_id?: string;
      parent_category_id?: string | null;
      is_active?: boolean;
    },
    pagination?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{ items: MenuCategory[]; total: number }> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 100;
    const offset = (page - 1) * limit;

    // Build queries using template literals (Neon doesn't support sql.unsafe)
    if (!filters || Object.keys(filters).length === 0) {
      // No filters - simple query
      const countResult = await sql`SELECT COUNT(*) as total FROM menu_categories`;
      const total = parseInt(countResult[0]?.total || "0");

      const items = await sql`
        SELECT * 
        FROM menu_categories 
        ORDER BY display_order ASC, name ASC
        LIMIT ${limit} OFFSET ${offset}
      `;

      return {
        items: items as MenuCategory[],
        total,
      };
    }

    // With filters - build queries based on what filters are present
    const hasRestaurantId = !!filters.restaurant_id;
    const hasParentCategoryId = filters.parent_category_id !== undefined;
    const hasIsActive = filters.is_active !== undefined;

    let countResult;
    let items;

    // Handle all combinations of filters
    if (hasRestaurantId && hasParentCategoryId && hasIsActive) {
      // All three filters
      if (filters.parent_category_id === null) {
        countResult = await sql`
          SELECT COUNT(*) as total 
          FROM menu_categories 
          WHERE restaurant_id = ${filters.restaurant_id} 
            AND parent_category_id IS NULL
            AND is_active = ${filters.is_active}
        `;
        items = await sql`
          SELECT * 
          FROM menu_categories 
          WHERE restaurant_id = ${filters.restaurant_id} 
            AND parent_category_id IS NULL
            AND is_active = ${filters.is_active}
          ORDER BY display_order ASC, name ASC
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        countResult = await sql`
          SELECT COUNT(*) as total 
          FROM menu_categories 
          WHERE restaurant_id = ${filters.restaurant_id} 
            AND parent_category_id = ${filters.parent_category_id}
            AND is_active = ${filters.is_active}
        `;
        items = await sql`
          SELECT * 
          FROM menu_categories 
          WHERE restaurant_id = ${filters.restaurant_id} 
            AND parent_category_id = ${filters.parent_category_id}
            AND is_active = ${filters.is_active}
          ORDER BY display_order ASC, name ASC
          LIMIT ${limit} OFFSET ${offset}
        `;
      }
    } else if (hasRestaurantId && hasParentCategoryId) {
      // restaurant_id + parent_category_id
      if (filters.parent_category_id === null) {
        countResult = await sql`
          SELECT COUNT(*) as total 
          FROM menu_categories 
          WHERE restaurant_id = ${filters.restaurant_id} 
            AND parent_category_id IS NULL
        `;
        items = await sql`
          SELECT * 
          FROM menu_categories 
          WHERE restaurant_id = ${filters.restaurant_id} 
            AND parent_category_id IS NULL
          ORDER BY display_order ASC, name ASC
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        countResult = await sql`
          SELECT COUNT(*) as total 
          FROM menu_categories 
          WHERE restaurant_id = ${filters.restaurant_id} 
            AND parent_category_id = ${filters.parent_category_id}
        `;
        items = await sql`
          SELECT * 
          FROM menu_categories 
          WHERE restaurant_id = ${filters.restaurant_id} 
            AND parent_category_id = ${filters.parent_category_id}
          ORDER BY display_order ASC, name ASC
          LIMIT ${limit} OFFSET ${offset}
        `;
      }
    } else if (hasRestaurantId && hasIsActive) {
      // restaurant_id + is_active (THIS IS THE CASE FOR YOUR REQUEST)
      countResult = await sql`
        SELECT COUNT(*) as total 
        FROM menu_categories 
        WHERE restaurant_id = ${filters.restaurant_id} 
          AND is_active = ${filters.is_active}
      `;
      items = await sql`
        SELECT * 
        FROM menu_categories 
        WHERE restaurant_id = ${filters.restaurant_id} 
          AND is_active = ${filters.is_active}
        ORDER BY display_order ASC, name ASC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (hasRestaurantId) {
      // Only restaurant_id
      countResult = await sql`
        SELECT COUNT(*) as total 
        FROM menu_categories 
        WHERE restaurant_id = ${filters.restaurant_id}
      `;
      items = await sql`
        SELECT * 
        FROM menu_categories 
        WHERE restaurant_id = ${filters.restaurant_id}
        ORDER BY display_order ASC, name ASC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (hasParentCategoryId && hasIsActive) {
      // parent_category_id + is_active
      if (filters.parent_category_id === null) {
        countResult = await sql`
          SELECT COUNT(*) as total 
          FROM menu_categories 
          WHERE parent_category_id IS NULL
            AND is_active = ${filters.is_active}
        `;
        items = await sql`
          SELECT * 
          FROM menu_categories 
          WHERE parent_category_id IS NULL
            AND is_active = ${filters.is_active}
          ORDER BY display_order ASC, name ASC
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        countResult = await sql`
          SELECT COUNT(*) as total 
          FROM menu_categories 
          WHERE parent_category_id = ${filters.parent_category_id}
            AND is_active = ${filters.is_active}
        `;
        items = await sql`
          SELECT * 
          FROM menu_categories 
          WHERE parent_category_id = ${filters.parent_category_id}
            AND is_active = ${filters.is_active}
          ORDER BY display_order ASC, name ASC
          LIMIT ${limit} OFFSET ${offset}
        `;
      }
    } else if (hasParentCategoryId) {
      // Only parent_category_id
      if (filters.parent_category_id === null) {
        countResult = await sql`
          SELECT COUNT(*) as total 
          FROM menu_categories 
          WHERE parent_category_id IS NULL
        `;
        items = await sql`
          SELECT * 
          FROM menu_categories 
          WHERE parent_category_id IS NULL
          ORDER BY display_order ASC, name ASC
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        countResult = await sql`
          SELECT COUNT(*) as total 
          FROM menu_categories 
          WHERE parent_category_id = ${filters.parent_category_id}
        `;
        items = await sql`
          SELECT * 
          FROM menu_categories 
          WHERE parent_category_id = ${filters.parent_category_id}
          ORDER BY display_order ASC, name ASC
          LIMIT ${limit} OFFSET ${offset}
        `;
      }
    } else if (hasIsActive) {
      // Only is_active
      countResult = await sql`
        SELECT COUNT(*) as total 
        FROM menu_categories 
        WHERE is_active = ${filters.is_active}
      `;
      items = await sql`
        SELECT * 
        FROM menu_categories 
        WHERE is_active = ${filters.is_active}
        ORDER BY display_order ASC, name ASC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      // Fallback - no filters (shouldn't reach here)
      countResult = await sql`SELECT COUNT(*) as total FROM menu_categories`;
      items = await sql`
        SELECT * 
        FROM menu_categories 
        ORDER BY display_order ASC, name ASC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const total = parseInt(countResult[0]?.total || "0");

    return {
      items: items as MenuCategory[],
      total,
    };
  }

  // Get category by ID
  static async findById(categoryId: string): Promise<MenuCategory | null> {
    const result = await sql`
      SELECT *
      FROM menu_categories
      WHERE category_id = ${categoryId}
    `;

    return (result[0] as MenuCategory) || null;
  }

  // Get categories by restaurant
  static async findByRestaurant(restaurantId: string, includeInactive: boolean = false): Promise<MenuCategory[]> {
    if (includeInactive) {
      const result = await sql`
        SELECT *
        FROM menu_categories
        WHERE restaurant_id = ${restaurantId}
        ORDER BY display_order ASC, name ASC
      `;
      return result as MenuCategory[];
    } else {
      const result = await sql`
        SELECT *
        FROM menu_categories
        WHERE restaurant_id = ${restaurantId}
          AND is_active = true
        ORDER BY display_order ASC, name ASC
      `;
      return result as MenuCategory[];
    }
  }

  // Get child categories (subcategories)
  static async findChildren(parentCategoryId: string): Promise<MenuCategory[]> {
    const result = await sql`
      SELECT *
      FROM menu_categories
      WHERE parent_category_id = ${parentCategoryId}
        AND is_active = true
      ORDER BY display_order ASC, name ASC
    `;

    return result as MenuCategory[];
  }

  // Get root categories (no parent)
  static async findRootCategories(restaurantId: string): Promise<MenuCategory[]> {
    const result = await sql`
      SELECT *
      FROM menu_categories
      WHERE restaurant_id = ${restaurantId}
        AND parent_category_id IS NULL
        AND is_active = true
      ORDER BY display_order ASC, name ASC
    `;

    return result as MenuCategory[];
  }

  // Create new category
  static async create(data: CreateMenuCategoryDto): Promise<MenuCategory> {
    const categoryId = uuidv4();

    const result = await sql`
      INSERT INTO menu_categories (
        category_id,
        restaurant_id,
        name,
        parent_category_id,
        display_order,
        description,
        image_url,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        ${categoryId},
        ${data.restaurant_id},
        ${data.name},
        ${data.parent_category_id || null},
        ${data.display_order || 0},
        ${data.description || null},
        ${data.image_url || null},
        ${data.is_active !== undefined ? data.is_active : true},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    return result[0] as MenuCategory;
  }

  // Update category
  static async update(categoryId: string, data: UpdateMenuCategoryDto): Promise<MenuCategory | null> {
    if (Object.keys(data).length === 0) {
      return this.findById(categoryId);
    }

    // Get existing category to preserve unchanged fields
    const existing = await this.findById(categoryId);
    if (!existing) {
      return null;
    }

    // Build update query using template literals
    // Neon requires template literals, so we handle all fields explicitly
    // Use COALESCE to only update provided fields
    const name = data.name !== undefined ? data.name : existing.name;
    const parent_category_id = data.parent_category_id !== undefined ? (data.parent_category_id || null) : existing.parent_category_id;
    const display_order = data.display_order !== undefined ? data.display_order : existing.display_order;
    const description = data.description !== undefined ? (data.description || null) : existing.description;
    const image_url = data.image_url !== undefined ? (data.image_url || null) : existing.image_url;
    const is_active = data.is_active !== undefined ? data.is_active : existing.is_active;

    const result = await sql`
      UPDATE menu_categories
      SET 
        name = ${name},
        parent_category_id = ${parent_category_id},
        display_order = ${display_order},
        description = ${description},
        image_url = ${image_url},
        is_active = ${is_active},
        updated_at = NOW()
      WHERE category_id = ${categoryId}
      RETURNING *
    `;

    return (result[0] as MenuCategory) || null;
  }

  // Delete category (soft delete by setting is_active = false)
  static async delete(categoryId: string): Promise<boolean> {
    // Check if category has menu items
    const itemsCount = await sql`
      SELECT COUNT(*) as count
      FROM menu_items
      WHERE category_id = ${categoryId}
    `;

    if (parseInt(itemsCount[0]?.count || "0") > 0) {
      throw new Error("Cannot delete category with menu items. Remove items first or set category as inactive.");
    }

    // Check if category has child categories
    const childrenCount = await sql`
      SELECT COUNT(*) as count
      FROM menu_categories
      WHERE parent_category_id = ${categoryId}
    `;

    if (parseInt(childrenCount[0]?.count || "0") > 0) {
      throw new Error("Cannot delete category with subcategories. Remove subcategories first.");
    }

    // Soft delete
    const result = await sql`
      UPDATE menu_categories
      SET is_active = false, updated_at = NOW()
      WHERE category_id = ${categoryId}
      RETURNING category_id
    `;

    return result.length > 0;
  }

  // Hard delete (use with caution)
  static async hardDelete(categoryId: string): Promise<boolean> {
    const result = await sql`
      DELETE FROM menu_categories
      WHERE category_id = ${categoryId}
      RETURNING category_id
    `;

    return result.length > 0;
  }

  // Get category tree for a restaurant (hierarchical structure)
  static async getCategoryTree(restaurantId: string): Promise<MenuCategory[]> {
    const allCategories = await this.findByRestaurant(restaurantId, true);
    
    // Build tree structure
    const categoryMap = new Map<string, MenuCategory & { children?: MenuCategory[] }>();
    const rootCategories: (MenuCategory & { children?: MenuCategory[] })[] = [];

    // First pass: create map
    allCategories.forEach(cat => {
      categoryMap.set(cat.category_id, { ...cat, children: [] });
    });

    // Second pass: build tree
    allCategories.forEach(cat => {
      const category = categoryMap.get(cat.category_id)!;
      if (cat.parent_category_id) {
        const parent = categoryMap.get(cat.parent_category_id);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(category);
        }
      } else {
        rootCategories.push(category);
      }
    });

    return rootCategories as MenuCategory[];
  }
}

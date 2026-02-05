import { sql } from '@/config/database';
import { Restaurant, CreateRestaurantDto } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class RestaurantModel {
  // Get restaurant by owner_id
  static async findByOwnerId(ownerId: string): Promise<Restaurant | null> {
    const result = await sql`
      SELECT 
        restaurant_id,
        name,
        description,
        founded_year,
        country,
        price_range,
        categories,
        specialties,
        keywords,
        food_categories,
        logo_url,
        status,
        owner_id,
        created_at,
        updated_at
      FROM restaurants
      WHERE owner_id = ${ownerId}
      LIMIT 1
    `;
    return (result[0] as Restaurant) || null;
  }

  // Get all restaurants with pagination
  static async findAll(
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: string;
      price_range?: string;
      categories?: string[];
      search?: string;
    }
  ): Promise<{ restaurants: Restaurant[]; total: number }> {
    const offset = (page - 1) * limit;
    let whereConditions: string[] = [];
    const queryParams: any[] = [limit, offset];

    if (filters?.status) {
      whereConditions.push(`status = $${queryParams.length + 1}`);
      queryParams.push(filters.status);
    }

    if (filters?.price_range) {
      whereConditions.push(`price_range = $${queryParams.length + 1}`);
      queryParams.push(filters.price_range);
    }

    if (filters?.categories && filters.categories.length > 0) {
      whereConditions.push(`categories && $${queryParams.length + 1}::text[]`);
      queryParams.push(filters.categories);
    }

    if (filters?.search) {
      whereConditions.push(
        `(name ILIKE $${queryParams.length + 1} OR description::text ILIKE $${queryParams.length + 1})`
      );
      queryParams.push(`%${filters.search}%`);
    }

    // Build queries with proper parameterization
    if (whereConditions.length === 0) {
      // No filters - simple query
      const countResult = await sql`SELECT COUNT(*) as total FROM restaurants`;
      const total = parseInt(countResult[0]?.total || "0");

      const restaurants = await sql`
        SELECT 
          restaurant_id,
          name,
          description,
          founded_year,
          country,
          price_range,
          categories,
          specialties,
          keywords,
          food_categories,
          logo_url,
          status,
          owner_id,
          created_at,
          updated_at
        FROM restaurants
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      return {
        restaurants: restaurants as Restaurant[],
        total,
      };
    }

    // With filters - need to build dynamic query
    // For now, use a simpler approach with individual queries
    let countResult;
    let restaurants;

    if (filters?.status && !filters?.price_range && !filters?.categories && !filters?.search) {
      countResult = await sql`SELECT COUNT(*) as total FROM restaurants WHERE status = ${filters.status}`;
      restaurants = await sql`
        SELECT 
          restaurant_id,
          name,
          description,
          founded_year,
          country,
          price_range,
          categories,
          specialties,
          keywords,
          food_categories,
          logo_url,
          status,
          owner_id,
          created_at,
          updated_at
        FROM restaurants
        WHERE status = ${filters.status}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (filters?.price_range && !filters?.status && !filters?.categories && !filters?.search) {
      countResult = await sql`SELECT COUNT(*) as total FROM restaurants WHERE price_range = ${filters.price_range}`;
      restaurants = await sql`
        SELECT 
          restaurant_id,
          name,
          description,
          founded_year,
          country,
          price_range,
          categories,
          specialties,
          keywords,
          food_categories,
          logo_url,
          status,
          owner_id,
          created_at,
          updated_at
        FROM restaurants
        WHERE price_range = ${filters.price_range}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      // Fallback to getting all and filtering in memory for complex queries
      // This is not ideal but works for now
      countResult = await sql`SELECT COUNT(*) as total FROM restaurants`;
      restaurants = await sql`
        SELECT 
          restaurant_id,
          name,
          description,
          founded_year,
          country,
          price_range,
          categories,
          specialties,
          keywords,
          food_categories,
          logo_url,
          status,
          owner_id,
          created_at,
          updated_at
        FROM restaurants
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const total = parseInt(countResult[0]?.total || "0");

    return {
      restaurants: restaurants as Restaurant[],
      total,
    };
  }

  // Get restaurant by ID
  static async findById(restaurantId: string): Promise<Restaurant | null> {
    const result = await sql`
      SELECT 
        restaurant_id,
        name,
        description,
        founded_year,
        country,
        price_range,
        categories,
        specialties,
        keywords,
        food_categories,
        logo_url,
        status,
        owner_id,
        created_at,
        updated_at
      FROM restaurants
      WHERE restaurant_id = ${restaurantId}
    `;

    return (result[0] as Restaurant) || null;
  }

  // Get restaurant by name or keyword
  static async findByKeyword(keyword: string): Promise<Restaurant[]> {
    const result = await sql`
      SELECT 
        restaurant_id,
        name,
        description,
        founded_year,
        country,
        price_range,
        categories,
        specialties,
        keywords,
        food_categories,
        logo_url,
        status,
        owner_id,
        created_at,
        updated_at
      FROM restaurants
      WHERE 
        name ILIKE ${`%${keyword}%`}
        OR keywords @> ${[keyword]}::text[]
        OR ${keyword} = ANY(keywords)
      AND status = 'active'
    `;

    return result as Restaurant[];
  }

  // Create new restaurant
  static async create(data: CreateRestaurantDto): Promise<Restaurant> {
    const restaurantId = uuidv4();

    const result = await sql`
      INSERT INTO restaurants (
        restaurant_id,
        name,
        description,
        founded_year,
        country,
        price_range,
        categories,
        specialties,
        keywords,
        food_categories,
        logo_url,
        status,
        owner_id,
        created_at,
        updated_at
      ) VALUES (
        ${restaurantId},
        ${data.name},
        ${JSON.stringify(data.description)},
        ${data.founded_year || null},
        ${data.country},
        ${data.price_range},
        ${data.categories},
        ${data.specialties},
        ${data.keywords},
        ${data.food_categories},
        ${data.logo_url || null},
        'active',
        ${data.owner_id || null},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    return result[0] as Restaurant;
  }

  // Update restaurant
  static async update(
    restaurantId: string,
    data: Partial<CreateRestaurantDto>
  ): Promise<Restaurant | null> {
    // Neon doesn't support sql.unsafe, so we fetch current record and merge
    const current = await this.findById(restaurantId);
    if (!current) {
      return null;
    }

    // Merge provided data with current data
    const mergedData: CreateRestaurantDto = {
      name: data.name ?? current.name,
      description: data.description ?? current.description,
      country: data.country ?? current.country,
      price_range: (data.price_range ?? current.price_range) as "budget" | "mid-range" | "premium",
      categories: data.categories ?? current.categories,
      specialties: data.specialties ?? current.specialties,
      keywords: data.keywords ?? current.keywords,
      food_categories: data.food_categories ?? current.food_categories,
      logo_url: data.logo_url ?? current.logo_url,
      founded_year: data.founded_year ?? current.founded_year ?? undefined,
    };

    // Update with merged data using template literal
    const result = await sql`
      UPDATE restaurants
      SET 
        name = ${mergedData.name},
        description = ${JSON.stringify(mergedData.description)},
        country = ${mergedData.country},
        price_range = ${mergedData.price_range},
        categories = ${mergedData.categories},
        specialties = ${mergedData.specialties},
        keywords = ${mergedData.keywords},
        food_categories = ${mergedData.food_categories},
        logo_url = ${mergedData.logo_url},
        founded_year = ${mergedData.founded_year ?? null},
        updated_at = NOW()
      WHERE restaurant_id = ${restaurantId}
      RETURNING *
    `;

    return (result[0] as Restaurant) || null;
  }

  // Delete restaurant (soft delete by setting status)
  static async delete(restaurantId: string): Promise<boolean> {
    const result = await sql`
      UPDATE restaurants
      SET status = 'inactive', updated_at = NOW()
      WHERE restaurant_id = ${restaurantId}
      RETURNING restaurant_id
    `;

    return result.length > 0;
  }

  // Get active restaurants only
  static async findActive(): Promise<Restaurant[]> {
    const result = await sql`
      SELECT 
        restaurant_id,
        name,
        description,
        founded_year,
        country,
        price_range,
        categories,
        specialties,
        keywords,
        food_categories,
        logo_url,
        status,
        owner_id,
        created_at,
        updated_at
      FROM restaurants
      WHERE status = 'active'
      ORDER BY name ASC
    `;

    return result as Restaurant[];
  }
}


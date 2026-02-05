import { sql } from "@/config/database";
import { RestaurantLocation } from "@/types";
import { v4 as uuidv4 } from "uuid";

export class LocationModel {
  static async findAll(restaurantId?: string): Promise<RestaurantLocation[]> {
    if (restaurantId) {
      const result = await sql`
        SELECT *
        FROM restaurant_locations
        WHERE restaurant_id = ${restaurantId}
        ORDER BY city, area ASC
      `;
      return result as RestaurantLocation[];
    }

    const result = await sql`
      SELECT *
      FROM restaurant_locations
      ORDER BY restaurant_id, city ASC
    `;
    return result as RestaurantLocation[];
  }

  static async findById(locationId: string): Promise<RestaurantLocation | null> {
    const result = await sql`
      SELECT *
      FROM restaurant_locations
      WHERE location_id = ${locationId}
    `;
    return (result[0] as RestaurantLocation) || null;
  }

  static async findByCity(city: string): Promise<RestaurantLocation[]> {
    const result = await sql`
      SELECT *
      FROM restaurant_locations
      WHERE city ILIKE ${`%${city}%`}
        AND status = 'open'
    `;
    return result as RestaurantLocation[];
  }

  static async create(data: Omit<RestaurantLocation, "location_id" | "created_at" | "updated_at">): Promise<RestaurantLocation> {
    const locationId = uuidv4();
    const result = await sql`
      INSERT INTO restaurant_locations (
        location_id,
        restaurant_id,
        city,
        area,
        address,
        lat,
        lng,
        phone,
        operating_hours,
        delivery_zones,
        status,
        created_at,
        updated_at
      ) VALUES (
        ${locationId},
        ${data.restaurant_id},
        ${data.city},
        ${data.area},
        ${data.address},
        ${data.lat || null},
        ${data.lng || null},
        ${data.phone || null},
        ${JSON.stringify(data.operating_hours)},
        ${JSON.stringify(data.delivery_zones)},
        ${data.status || "open"},
        NOW(),
        NOW()
      )
      RETURNING *
    `;
    return result[0] as RestaurantLocation;
  }

  static async update(locationId: string, data: Partial<RestaurantLocation>): Promise<RestaurantLocation | null> {
    // Neon doesn't support sql.unsafe, so we fetch current record and merge
    const current = await this.findById(locationId);
    if (!current) {
      return null;
    }

    // Merge provided data with current data
    const mergedData: RestaurantLocation = {
      location_id: current.location_id,
      restaurant_id: current.restaurant_id,
      city: data.city ?? current.city,
      area: data.area ?? current.area,
      address: data.address ?? current.address,
      lat: data.lat ?? current.lat ?? null,
      lng: data.lng ?? current.lng ?? null,
      phone: data.phone ?? current.phone ?? null,
      operating_hours: data.operating_hours ?? current.operating_hours ?? null,
      delivery_zones: data.delivery_zones ?? current.delivery_zones ?? null,
      status: data.status ?? current.status,
      created_at: current.created_at,
      updated_at: current.updated_at,
    };

    // Update with merged data using template literal
    const result = await sql`
      UPDATE restaurant_locations
      SET 
        city = ${mergedData.city},
        area = ${mergedData.area},
        address = ${mergedData.address},
        lat = ${mergedData.lat},
        lng = ${mergedData.lng},
        phone = ${mergedData.phone},
        operating_hours = ${mergedData.operating_hours ? JSON.stringify(mergedData.operating_hours) : null}::jsonb,
        delivery_zones = ${mergedData.delivery_zones ? JSON.stringify(mergedData.delivery_zones) : null}::jsonb,
        status = ${mergedData.status},
        updated_at = NOW()
      WHERE location_id = ${locationId}
      RETURNING *
    `;
    return (result[0] as RestaurantLocation) || null;
  }

  static async delete(locationId: string): Promise<boolean> {
    const result = await sql`
      UPDATE restaurant_locations
      SET status = 'closed', updated_at = NOW()
      WHERE location_id = ${locationId}
      RETURNING location_id
    `;
    return result.length > 0;
  }
}

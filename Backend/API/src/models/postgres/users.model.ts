import { sql } from "@/config/database";
import { User, CreateUserDto, UpdateUserDto } from "@/types";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

export class UserModel {
  static async findAll(): Promise<User[]> {
    const result = await sql`
      SELECT
        user_id,
        email,
        phone,
        name,
        role,
        preferred_language,
        favorite_restaurants,
        dietary_preferences,
        addresses,
        created_at,
        last_active_at
      FROM users
      ORDER BY created_at DESC
    `;
    // Explicitly exclude password_hash from results
    return result.map((row: any) => {
      const { password_hash, ...user } = row;
      return user;
    }) as User[];
  }

  static async findById(userId: string): Promise<User | null> {
    const result = await sql`
      SELECT
        user_id,
        email,
        phone,
        name,
        role,
        preferred_language,
        favorite_restaurants,
        dietary_preferences,
        addresses,
        created_at,
        last_active_at
      FROM users
      WHERE user_id = ${userId}
    `;
    return (result[0] as User) || null;
  }
  
  static async findByIdWithPassword(userId: string): Promise<(User & { password_hash?: string | null }) | null> {
    try {
      const result = await sql`
        SELECT
          user_id,
          email,
          phone,
          name,
          role,
          preferred_language,
          favorite_restaurants,
          dietary_preferences,
          addresses,
          password_hash,
          created_at,
          last_active_at
        FROM users
        WHERE user_id = ${userId}
      `;
      return (result[0] as (User & { password_hash?: string | null })) || null;
    } catch (error: any) {
      // If password_hash column is missing, surface a clear error so login cannot silently bypass password verification
      if (error.code === '42703' || error.message?.includes('password_hash') || error.message?.includes('column')) {
        throw new Error("Database migration required: password_hash column is missing. Please run the migration to add it.");
      }
      throw error;
    }
  }
  
  /**
   * Verify password for a user
   */
  static async verifyPassword(user: User & { password_hash?: string }, password: string): Promise<boolean> {
    if (!user.password_hash) {
      return false; // User doesn't have a password set
    }
    return bcrypt.compare(password, user.password_hash);
  }

  static async findByEmail(email: string, includePassword: boolean = false): Promise<(User & { password_hash?: string | null }) | null> {
    try {
      const result = includePassword
        ? await sql`
            SELECT
              user_id,
              email,
              phone,
              name,
              role,
              preferred_language,
              favorite_restaurants,
              dietary_preferences,
              addresses,
              password_hash,
              created_at,
              last_active_at
            FROM users
            WHERE email = ${email}
          `
        : await sql`
            SELECT
              user_id,
              email,
              phone,
              name,
              role,
              preferred_language,
              favorite_restaurants,
              dietary_preferences,
              addresses,
              created_at,
              last_active_at
            FROM users
            WHERE email = ${email}
          `;
      return (result[0] as (User & { password_hash?: string | null })) || null;
    } catch (error: any) {
      if (includePassword && (error.code === '42703' || error.message?.includes('password_hash') || error.message?.includes('column'))) {
        throw new Error("Database migration required: password_hash column is missing. Please run the migration to add it.");
      }
      throw error;
    }
  }

  static async findByPhone(phone: string, includePassword: boolean = false): Promise<(User & { password_hash?: string | null }) | null> {
    try {
      const result = includePassword
        ? await sql`
            SELECT
              user_id,
              email,
              phone,
              name,
              role,
              preferred_language,
              favorite_restaurants,
              dietary_preferences,
              addresses,
              password_hash,
              created_at,
              last_active_at
            FROM users
            WHERE phone = ${phone}
          `
        : await sql`
            SELECT
              user_id,
              email,
              phone,
              name,
              role,
              preferred_language,
              favorite_restaurants,
              dietary_preferences,
              addresses,
              created_at,
              last_active_at
            FROM users
            WHERE phone = ${phone}
          `;
      return (result[0] as (User & { password_hash?: string | null })) || null;
    } catch (error: any) {
      if (includePassword && (error.code === '42703' || error.message?.includes('password_hash') || error.message?.includes('column'))) {
        throw new Error("Database migration required: password_hash column is missing. Please run the migration to add it.");
      }
      throw error;
    }
  }

  static async create(data: CreateUserDto): Promise<User> {
    // Check if user already exists by email or phone
    let existingUser: (User & { password_hash?: string }) | null = null;
    
    if (data.email) {
      existingUser = await this.findByEmail(data.email, true);
    }
    
    if (!existingUser && data.phone) {
      existingUser = await this.findByPhone(data.phone, true);
    }
    
    // If user exists and has no password, and we're providing a password, update it
    if (existingUser && !existingUser.password_hash && data.password) {
      if (data.password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      const passwordHash = await bcrypt.hash(data.password, 10);
      
      // Update the existing user with password and other data
      const result = await sql`
        UPDATE users
        SET
          password_hash = ${passwordHash},
          name = ${data.name},
          role = COALESCE(${data.role || null}, role),
          preferred_language = ${data.preferred_language},
          favorite_restaurants = ${data.favorite_restaurants || existingUser.favorite_restaurants},
          dietary_preferences = ${data.dietary_preferences || existingUser.dietary_preferences},
          addresses = ${data.addresses || existingUser.addresses},
          last_active_at = NOW()
        WHERE user_id = ${existingUser.user_id}
        RETURNING 
          user_id,
          email,
          phone,
          name,
          role,
          preferred_language,
          favorite_restaurants,
          dietary_preferences,
          addresses,
          created_at,
          last_active_at
      `;
      return result[0] as User;
    }
    
    // If user exists and already has a password, throw error
    if (existingUser && existingUser.password_hash) {
      throw new Error("User already exists. Please login instead.");
    }
    
    // Create new user
    const userId = uuidv4();
    
    // Hash password if provided
    let passwordHash = null;
    if (data.password) {
      if (data.password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      passwordHash = await bcrypt.hash(data.password, 10);
    }
    
    try {
      const result = await sql`
        INSERT INTO users (
          user_id,
          email,
          phone,
          name,
          password_hash,
          role,
          preferred_language,
          favorite_restaurants,
          dietary_preferences,
          addresses,
          created_at,
          last_active_at
        ) VALUES (
          ${userId},
          ${data.email || null},
          ${data.phone || null},
          ${data.name},
          ${passwordHash},
          ${data.role || "customer"},
          ${data.preferred_language},
          ${data.favorite_restaurants || []},
          ${data.dietary_preferences || []},
          ${data.addresses || []},
          NOW(),
          NOW()
        )
        RETURNING 
          user_id,
          email,
          phone,
          name,
          role,
          preferred_language,
          favorite_restaurants,
          dietary_preferences,
          addresses,
          created_at,
          last_active_at
      `;
      return result[0] as User;
    } catch (error: any) {
      // Handle unique constraint violations
      if (error.code === '23505') { // PostgreSQL unique violation
        if (error.constraint?.includes('email')) {
          throw new Error("User with this email already exists. Please login instead.");
        }
        if (error.constraint?.includes('phone')) {
          throw new Error("User with this phone number already exists. Please login instead.");
        }
        throw new Error("User already exists. Please login instead.");
      }
      // Handle column doesn't exist error (password_hash column missing)
      if (error.code === '42703' || error.message?.includes('password_hash') || error.message?.includes('column')) {
        throw new Error("Database migration required: password_hash column is missing. Please run the migration: ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);");
      }
      throw error;
    }
  }

  static async update(userId: string, data: UpdateUserDto): Promise<User | null> {
    const existing = await this.findById(userId);
    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      ...data,
      last_active_at: data.last_active_at || existing.last_active_at,
    };

    const result = await sql`
      UPDATE users
      SET
        email = ${updated.email},
        phone = ${updated.phone},
        name = ${updated.name},
        role = ${updated.role || existing.role},
        preferred_language = ${updated.preferred_language},
        favorite_restaurants = ${updated.favorite_restaurants},
        dietary_preferences = ${updated.dietary_preferences},
        addresses = ${updated.addresses},
        last_active_at = ${updated.last_active_at}
      WHERE user_id = ${userId}
      RETURNING *
    `;

    return (result[0] as User) || null;
  }

  static async delete(userId: string): Promise<boolean> {
    const result = await sql`
      DELETE FROM users WHERE user_id = ${userId} RETURNING user_id
    `;
    return result.length > 0;
  }
}


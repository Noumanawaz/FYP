import { UserModel } from "@/models/postgres/users.model";
import { CreateUserDto, UpdateUserDto, User } from "@/types";
import { AppError } from "@/middleware/error-handler";

export class UserService {
  static async getAllUsers(): Promise<User[]> {
    return UserModel.findAll();
  }

  static async getUserById(userId: string, includePassword: boolean = false): Promise<User & { password_hash?: string | null }> {
    const user = includePassword
      ? await UserModel.findByIdWithPassword(userId)
      : await UserModel.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return user;
  }

  static async getUserByEmail(email: string, includePassword: boolean = false): Promise<User & { password_hash?: string }> {
    const user = await UserModel.findByEmail(email, includePassword);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return user;
  }

  static async getUserByPhone(phone: string, includePassword: boolean = false): Promise<User & { password_hash?: string }> {
    const user = await UserModel.findByPhone(phone, includePassword);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return user;
  }

  static async createUser(payload: CreateUserDto): Promise<User> {
    return UserModel.create(payload);
  }

  static async updateUser(userId: string, payload: UpdateUserDto): Promise<User> {
    const updated = await UserModel.update(userId, payload);
    if (!updated) {
      throw new AppError("User not found", 404);
    }
    return updated;
  }

  static async deleteUser(userId: string): Promise<void> {
    const deleted = await UserModel.delete(userId);
    if (!deleted) {
      throw new AppError("User not found", 404);
    }
  }
}


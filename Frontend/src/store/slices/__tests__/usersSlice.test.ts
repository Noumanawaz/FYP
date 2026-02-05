import usersReducer, { setUser, clearUser, clearError, fetchCurrentUser, updateUser, initialState } from "../usersSlice";
import { apiService } from "../../../services/api";
import { User } from "../../../types";

// Mock the API service
jest.mock("../../../services/api", () => ({
  apiService: {
    getUser: jest.fn(),
    updateUser: jest.fn(),
  },
}));

describe("usersSlice - Whitebox Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should have correct initial state structure", () => {
      expect(initialState).toEqual({
        currentUser: null,
        loading: false,
        error: null,
        isAuthenticated: false,
      });
    });
  });

  describe("setUser reducer", () => {
    it("should set user and mark as authenticated", () => {
      const mockUser = {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
        phone: "1234567890",
        role: "customer" as const,
        isVerified: true,
        addresses: [],
        paymentMethods: [],
        createdAt: new Date(),
      };

      const action = setUser(mockUser);
      const newState = usersReducer(initialState, action);

      expect(newState.currentUser).toEqual(mockUser);
      expect(newState.isAuthenticated).toBe(true);
    });

    it("should clear user and mark as unauthenticated when null", () => {
      const stateWithUser = {
        ...initialState,
        currentUser: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          phone: "1234567890",
          role: "customer" as const,
          isVerified: true,
          addresses: [],
          paymentMethods: [],
          createdAt: new Date(),
        },
        isAuthenticated: true,
      };

      const action = setUser(null);
      const newState = usersReducer(stateWithUser, action);

      expect(newState.currentUser).toBeNull();
      expect(newState.isAuthenticated).toBe(false);
    });
  });

  describe("clearUser reducer", () => {
    it("should clear user and authentication state", () => {
      const stateWithUser = {
        ...initialState,
        currentUser: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          phone: "1234567890",
          role: "customer" as const,
          isVerified: true,
          addresses: [],
          paymentMethods: [],
          createdAt: new Date(),
        },
        isAuthenticated: true,
      };

      const action = clearUser();
      const newState = usersReducer(stateWithUser, action);

      expect(newState.currentUser).toBeNull();
      expect(newState.isAuthenticated).toBe(false);
    });
  });

  describe("clearError reducer", () => {
    it("should clear error state", () => {
      const stateWithError = {
        ...initialState,
        error: "Some error",
      };

      const action = clearError();
      const newState = usersReducer(stateWithError, action);

      expect(newState.error).toBeNull();
    });
  });

  describe("fetchCurrentUser async thunk", () => {
    it("should set loading to true when pending", () => {
      const action = { type: fetchCurrentUser.pending.type };
      const newState = usersReducer(initialState, action);

      expect(newState.loading).toBe(true);
      expect(newState.error).toBeNull();
    });

    it("should transform and store user when fulfilled", () => {
      const mockBackendUser = {
        user_id: "user-123",
        name: "Test User",
        email: "test@example.com",
        phone: "1234567890",
        role: "customer",
        created_at: "2024-01-01T00:00:00Z",
      };

      const action = {
        type: fetchCurrentUser.fulfilled.type,
        payload: mockBackendUser,
      };
      const newState = usersReducer(initialState, action);

      expect(newState.loading).toBe(false);
      expect(newState.currentUser).not.toBeNull();
      expect(newState.currentUser?.id).toBe("user-123");
      expect(newState.currentUser?.name).toBe("Test User");
      expect(newState.currentUser?.email).toBe("test@example.com");
      expect(newState.currentUser?.role).toBe("customer");
      expect(newState.isAuthenticated).toBe(true);
    });

    it("should handle user with addresses", () => {
      const mockBackendUser = {
        user_id: "user-123",
        name: "Test User",
        email: "test@example.com",
        role: "customer",
        addresses: [
          {
            id: "addr-1",
            street: "123 Main St",
            city: "Lahore",
            lat: 31.5497,
            lng: 74.3436,
            is_default: true,
            label: "Home",
          },
        ],
      };

      const action = {
        type: fetchCurrentUser.fulfilled.type,
        payload: mockBackendUser,
      };
      const newState = usersReducer(initialState, action);

      expect(newState.currentUser?.addresses).toHaveLength(1);
      expect(newState.currentUser?.addresses[0].city).toBe("Lahore");
      expect(newState.currentUser?.addresses[0].isDefault).toBe(true);
      expect(newState.currentUser?.addresses[0].coordinates).toEqual({
        lat: 31.5497,
        lng: 74.3436,
      });
    });

    it("should handle user with missing email", () => {
      const mockBackendUser = {
        user_id: "user-123",
        name: "Test User",
        phone: "1234567890",
        role: "customer",
      };

      const action = {
        type: fetchCurrentUser.fulfilled.type,
        payload: mockBackendUser,
      };
      const newState = usersReducer(initialState, action);

      expect(newState.currentUser?.email).toBe("");
    });

    it("should handle user with missing phone", () => {
      const mockBackendUser = {
        user_id: "user-123",
        name: "Test User",
        email: "test@example.com",
        role: "customer",
      };

      const action = {
        type: fetchCurrentUser.fulfilled.type,
        payload: mockBackendUser,
      };
      const newState = usersReducer(initialState, action);

      expect(newState.currentUser?.phone).toBe("");
    });

    it("should set error and unauthenticated when rejected", () => {
      const action = {
        type: fetchCurrentUser.rejected.type,
        error: { message: "User not found" },
      };
      const newState = usersReducer(initialState, action);

      expect(newState.loading).toBe(false);
      expect(newState.error).toBe("User not found");
      expect(newState.isAuthenticated).toBe(false);
    });
  });

  describe("updateUser async thunk", () => {
    it("should set loading to true when pending", () => {
      const action = { type: updateUser.pending.type };
      const newState = usersReducer(initialState, action);

      expect(newState.loading).toBe(true);
      expect(newState.error).toBeNull();
    });

    it("should update user when fulfilled", () => {
      const existingUser = {
        id: "user-123",
        name: "Old Name",
        email: "old@example.com",
        phone: "1234567890",
        role: "customer" as const,
        isVerified: true,
        addresses: [],
        paymentMethods: [],
        createdAt: new Date(),
      };

      const stateWithUser = {
        ...initialState,
        currentUser: existingUser,
      };

      const mockUpdatedUser = {
        user_id: "user-123",
        name: "New Name",
        email: "new@example.com",
        phone: "9876543210",
        role: "customer",
      };

      const action = {
        type: updateUser.fulfilled.type,
        payload: mockUpdatedUser,
      };
      const newState = usersReducer(stateWithUser, action);

      expect(newState.loading).toBe(false);
      expect(newState.currentUser?.name).toBe("New Name");
      expect(newState.currentUser?.email).toBe("new@example.com");
      expect(newState.currentUser?.phone).toBe("9876543210");
    });

    it("should set error when rejected", () => {
      const action = {
        type: updateUser.rejected.type,
        error: { message: "Update failed" },
      };
      const newState = usersReducer(initialState, action);

      expect(newState.loading).toBe(false);
      expect(newState.error).toBe("Update failed");
    });
  });

  describe("Edge Cases", () => {
    it("should handle restaurant_owner role", () => {
      const mockBackendUser = {
        user_id: "owner-123",
        name: "Restaurant Owner",
        role: "restaurant_owner",
      };

      const action = {
        type: fetchCurrentUser.fulfilled.type,
        payload: mockBackendUser,
      };
      const newState = usersReducer(initialState, action);

      expect(newState.currentUser?.role).toBe("restaurant_owner");
    });

    it("should handle admin role", () => {
      const mockBackendUser = {
        user_id: "admin-123",
        name: "Admin",
        role: "admin",
      };

      const action = {
        type: fetchCurrentUser.fulfilled.type,
        payload: mockBackendUser,
      };
      const newState = usersReducer(initialState, action);

      expect(newState.currentUser?.role).toBe("admin");
    });

    it("should handle address without coordinates", () => {
      const mockBackendUser = {
        user_id: "user-123",
        name: "Test User",
        role: "customer",
        addresses: [
          {
            street: "123 Main St",
            city: "Lahore",
          },
        ],
      };

      const action = {
        type: fetchCurrentUser.fulfilled.type,
        payload: mockBackendUser,
      };
      const newState = usersReducer(initialState, action);

      expect(newState.currentUser?.addresses[0].coordinates).toEqual({
        lat: 0,
        lng: 0,
      });
    });

    it("should handle address with generated id", () => {
      const mockBackendUser = {
        user_id: "user-123",
        name: "Test User",
        role: "customer",
        addresses: [
          {
            street: "123 Main St",
            city: "Lahore",
          },
        ],
      };

      const action = {
        type: fetchCurrentUser.fulfilled.type,
        payload: mockBackendUser,
      };
      const newState = usersReducer(initialState, action);

      expect(newState.currentUser?.addresses[0].id).toBe("123 Main St-Lahore");
    });

    it("should handle created_at timestamp", () => {
      const mockBackendUser = {
        user_id: "user-123",
        name: "Test User",
        role: "customer",
        created_at: "2024-01-01T00:00:00Z",
      };

      const action = {
        type: fetchCurrentUser.fulfilled.type,
        payload: mockBackendUser,
      };
      const newState = usersReducer(initialState, action);

      expect(newState.currentUser?.createdAt).toBeInstanceOf(Date);
    });

    it("should use current date if created_at is missing", () => {
      const mockBackendUser = {
        user_id: "user-123",
        name: "Test User",
        role: "customer",
      };

      const beforeDate = Date.now();
      const action = {
        type: fetchCurrentUser.fulfilled.type,
        payload: mockBackendUser,
      };
      const newState = usersReducer(initialState, action);
      const afterDate = Date.now();

      expect(newState.currentUser?.createdAt.getTime()).toBeGreaterThanOrEqual(beforeDate);
      expect(newState.currentUser?.createdAt.getTime()).toBeLessThanOrEqual(afterDate);
    });
  });
});

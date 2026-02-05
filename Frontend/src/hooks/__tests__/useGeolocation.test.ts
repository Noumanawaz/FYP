import { renderHook, act } from "@testing-library/react";
import { useGeolocation } from "../useGeolocation";

describe("useGeolocation - Whitebox Tests", () => {
  const mockGetCurrentPosition = jest.fn();
  const mockWatchPosition = jest.fn();
  const mockClearWatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset navigator.geolocation mock
    (navigator.geolocation as any) = {
      getCurrentPosition: mockGetCurrentPosition,
      watchPosition: mockWatchPosition,
      clearWatch: mockClearWatch,
    };
  });

  describe("Initial State", () => {
    it("should initialize with null coordinates and no error", () => {
      const { result } = renderHook(() => useGeolocation());

      expect(result.current.coordinates).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should provide getCurrentLocation function", () => {
      const { result } = renderHook(() => useGeolocation());

      expect(typeof result.current.getCurrentLocation).toBe("function");
    });
  });

  describe("getCurrentLocation", () => {
    it("should set loading to true when called", () => {
      mockGetCurrentPosition.mockImplementation((success) => {
        setTimeout(
          () =>
            success({
              coords: {
                latitude: 33.6844,
                longitude: 73.0479,
              },
            }),
          0
        );
      });

      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.getCurrentLocation();
      });

      expect(result.current.isLoading).toBe(true);
    });

    it("should update coordinates on success", async () => {
      const mockPosition = {
        coords: {
          latitude: 33.6844,
          longitude: 73.0479,
        },
      };

      mockGetCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const { result } = renderHook(() => useGeolocation());

      await act(async () => {
        result.current.getCurrentLocation();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.coordinates).toEqual({
        lat: 33.6844,
        lng: 73.0479,
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should handle permission denied error", async () => {
      const mockError = {
        code: 1, // PERMISSION_DENIED
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: "User denied geolocation",
      };

      mockGetCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      const { result } = renderHook(() => useGeolocation());

      await act(async () => {
        result.current.getCurrentLocation();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe("Location access denied by user");
      expect(result.current.isLoading).toBe(false);
      expect(result.current.coordinates).toBeNull();
    });

    it("should handle position unavailable error", async () => {
      const mockError = {
        code: 2, // POSITION_UNAVAILABLE
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: "Position unavailable",
      };

      mockGetCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      const { result } = renderHook(() => useGeolocation());

      await act(async () => {
        result.current.getCurrentLocation();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe("Location information unavailable");
    });

    it("should handle timeout error", async () => {
      const mockError = {
        code: 3, // TIMEOUT
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: "Timeout",
      };

      mockGetCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      const { result } = renderHook(() => useGeolocation());

      await act(async () => {
        result.current.getCurrentLocation();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe("Location request timed out");
    });

    it("should use correct options for getCurrentPosition", () => {
      mockGetCurrentPosition.mockImplementation((success, error, options) => {
        expect(options.enableHighAccuracy).toBe(false);
        expect(options.timeout).toBe(5000);
        expect(options.maximumAge).toBe(60000);
        success({
          coords: { latitude: 0, longitude: 0 },
        });
      });

      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.getCurrentLocation();
      });

      expect(mockGetCurrentPosition).toHaveBeenCalled();
    });

    it("should handle geolocation not supported", () => {
      // Mock navigator without geolocation
      const originalGeolocation = (navigator as any).geolocation;
      
      // Set it to undefined (can't delete because it's defined in setupTests)
      (navigator as any).geolocation = undefined;

      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.getCurrentLocation();
      });

      expect(result.current.error).toBe("Geolocation is not supported by this browser");
      expect(result.current.isLoading).toBe(false);

      // Restore
      (navigator as any).geolocation = originalGeolocation;
    });
  });

  describe("State Management", () => {
    it("should clear previous error when new request is made", async () => {
      const { result } = renderHook(() => useGeolocation());

      // First call with error
      mockGetCurrentPosition.mockImplementationOnce((success, error) => {
        error({ code: 1, message: "Error" });
      });

      await act(async () => {
        result.current.getCurrentLocation();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBeTruthy();

      // Second call with success
      mockGetCurrentPosition.mockImplementationOnce((success) => {
        success({
          coords: { latitude: 33.6844, longitude: 73.0479 },
        });
      });

      await act(async () => {
        result.current.getCurrentLocation();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBeNull();
    });

    it("should maintain coordinates across multiple calls", async () => {
      mockGetCurrentPosition.mockImplementation((success) => {
        success({
          coords: { latitude: 33.6844, longitude: 73.0479 },
        });
      });

      const { result } = renderHook(() => useGeolocation());

      await act(async () => {
        result.current.getCurrentLocation();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const firstCoordinates = result.current.coordinates;

      await act(async () => {
        result.current.getCurrentLocation();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.coordinates).toEqual(firstCoordinates);
    });
  });

  describe("Edge Cases", () => {
    it("should handle invalid coordinates", async () => {
      mockGetCurrentPosition.mockImplementation((success) => {
        success({
          coords: {
            latitude: NaN,
            longitude: Infinity,
          },
        });
      });

      const { result } = renderHook(() => useGeolocation());

      await act(async () => {
        result.current.getCurrentLocation();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.coordinates).toEqual({
        lat: NaN,
        lng: Infinity,
      });
    });

    it("should handle unknown error codes", async () => {
      const mockError = {
        code: 999,
        message: "Unknown error",
      };

      mockGetCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      const { result } = renderHook(() => useGeolocation());

      await act(async () => {
        result.current.getCurrentLocation();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe("Unable to retrieve location");
    });
  });
});

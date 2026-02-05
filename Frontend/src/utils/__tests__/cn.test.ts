import { cn } from "../cn";

describe("cn utility - Whitebox Tests", () => {
  describe("Basic functionality", () => {
    it("should join strings with spaces", () => {
      const result = cn("class1", "class2", "class3");
      expect(result).toBe("class1 class2 class3");
    });

    it("should filter out falsy values", () => {
      const result = cn("class1", false, "class2", null, "class3", undefined);
      expect(result).toBe("class1 class2 class3");
    });

    it("should handle empty strings", () => {
      const result = cn("class1", "", "class2");
      expect(result).toBe("class1 class2");
    });

    it("should handle numbers", () => {
      const result = cn("class1", 0, "class2", 123);
      expect(result).toBe("class1 class2 123");
    });

    it("should handle boolean values", () => {
      const result = cn("class1", true, "class2", false);

      // filter(Boolean) keeps truthy values, so true becomes "true" string
      expect(result).toBe("class1 true class2");
    });
  });

  describe("Array handling", () => {
    it("should flatten arrays", () => {
      const result = cn("class1", ["class2", "class3"], "class4");
      expect(result).toBe("class1 class2 class3 class4");
    });

    it("should handle nested arrays", () => {
      const result = cn("class1", ["class2", ["class3", "class4"]], "class5");

      // flat() only flattens one level, nested arrays become comma-separated strings
      expect(result).toBe("class1 class2 class3,class4 class5");
    });

    it("should filter falsy values in arrays", () => {
      const result = cn("class1", ["class2", false, "class3", null], "class4");
      expect(result).toBe("class1 class2 class3 class4");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty input", () => {
      const result = cn();
      expect(result).toBe("");
    });

    it("should handle all falsy values", () => {
      const result = cn(false, null, undefined, "", 0);
      expect(result).toBe("");
    });

    it("should handle mixed types", () => {
      const result = cn("class1", 42, true, false, null, undefined, "class2");

      // filter(Boolean) keeps truthy values, so true becomes "true" string
      expect(result).toBe("class1 42 true class2");
    });

    it("should handle whitespace in strings", () => {
      const result = cn("class1  class2", "class3");
      expect(result).toBe("class1  class2 class3");
    });

    it("should handle zero as valid value", () => {
      const result = cn("class1", 0, "class2");
      expect(result).toBe("class1 class2");
    });
  });

  describe("Real-world scenarios", () => {
    it("should handle conditional classes", () => {
      const isActive = true;
      const isDisabled = false;
      const result = cn("base-class", isActive && "active", isDisabled && "disabled");
      expect(result).toBe("base-class active");
    });

    it("should handle className merging", () => {
      const baseClasses = "btn btn-primary";
      const additionalClasses = "btn-lg";
      const result = cn(baseClasses, additionalClasses);
      expect(result).toBe("btn btn-primary btn-lg");
    });

    it("should handle complex conditional logic", () => {
      const variant = "primary";
      const size = "lg";
      const isDisabled = false;
      const result = cn("btn", variant === "primary" && "btn-primary", size === "lg" && "btn-lg", isDisabled && "btn-disabled");
      expect(result).toBe("btn btn-primary btn-lg");
    });
  });
});

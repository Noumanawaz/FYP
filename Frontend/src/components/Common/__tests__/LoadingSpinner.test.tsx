import { render } from "@testing-library/react";
import LoadingSpinner from "../LoadingSpinner";

describe("LoadingSpinner - Whitebox Tests", () => {
  describe("Rendering", () => {
    it("should render spinner element", () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.firstChild as HTMLElement;

      expect(spinner).toBeInTheDocument();
      expect(spinner?.tagName).toBe("DIV");
    });

    it("should have correct base classes", () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.firstChild as HTMLElement;

      expect(spinner.className).toContain("animate-spin");
      expect(spinner.className).toContain("rounded-full");
      expect(spinner.className).toContain("border-2");
      expect(spinner.className).toContain("border-gray-200");
      expect(spinner.className).toContain("border-t-primary-500");
    });
  });

  describe("Sizes", () => {
    it("should apply small size classes", () => {
      const { container } = render(<LoadingSpinner size="sm" />);
      const spinner = container.firstChild as HTMLElement;

      expect(spinner.className).toContain("w-4");
      expect(spinner.className).toContain("h-4");
    });

    it("should apply medium size classes", () => {
      const { container } = render(<LoadingSpinner size="md" />);
      const spinner = container.firstChild as HTMLElement;

      expect(spinner.className).toContain("w-8");
      expect(spinner.className).toContain("h-8");
    });

    it("should apply large size classes", () => {
      const { container } = render(<LoadingSpinner size="lg" />);
      const spinner = container.firstChild as HTMLElement;

      expect(spinner.className).toContain("w-12");
      expect(spinner.className).toContain("h-12");
    });

    it("should default to medium size", () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.firstChild as HTMLElement;

      expect(spinner.className).toContain("w-8");
      expect(spinner.className).toContain("h-8");
    });
  });

  describe("Custom ClassName", () => {
    it("should merge custom className with default classes", () => {
      const { container } = render(<LoadingSpinner className="custom-class" />);
      const spinner = container.firstChild as HTMLElement;

      expect(spinner.className).toContain("custom-class");
      expect(spinner.className).toContain("animate-spin");
    });

    it("should allow overriding default classes", () => {
      const { container } = render(<LoadingSpinner className="border-red-500" />);
      const spinner = container.firstChild as HTMLElement;

      // Both classes should be present (cn utility handles merging)
      expect(spinner.className).toContain("border-t-primary-500");
      expect(spinner.className).toContain("border-red-500");
    });
  });

  describe("Visual Structure", () => {
    it("should be circular (rounded-full)", () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.firstChild as HTMLElement;

      expect(spinner.className).toContain("rounded-full");
    });

    it("should have border styling", () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.firstChild as HTMLElement;

      expect(spinner.className).toContain("border-2");
      expect(spinner.className).toContain("border-gray-200");
      expect(spinner.className).toContain("border-t-primary-500");
    });

    it("should have animation class", () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.firstChild as HTMLElement;

      expect(spinner.className).toContain("animate-spin");
    });
  });

  describe("Size Combinations", () => {
    it("should apply correct size for each variant", () => {
      const sizes: Array<"sm" | "md" | "lg"> = ["sm", "md", "lg"];
      const expectedSizes = [
        { width: "w-4", height: "h-4" },
        { width: "w-8", height: "h-8" },
        { width: "w-12", height: "h-12" },
      ];

      sizes.forEach((size, index) => {
        const { container } = render(<LoadingSpinner size={size} />);
        const spinner = container.firstChild as HTMLElement;

        expect(spinner.className).toContain(expectedSizes[index].width);
        expect(spinner.className).toContain(expectedSizes[index].height);
      });
    });
  });
});

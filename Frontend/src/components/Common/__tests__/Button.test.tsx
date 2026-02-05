import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "../Button";

describe("Button - Whitebox Tests", () => {
  describe("Rendering", () => {
    it("should render button with children", () => {
      render(<Button>Click Me</Button>);

      expect(screen.getByText("Click Me")).toBeInTheDocument();
    });

    it("should render as button element", () => {
      const { container } = render(<Button>Test</Button>);
      const button = container.querySelector("button");

      expect(button).toBeInTheDocument();
      expect(button?.tagName).toBe("BUTTON");
    });
  });

  describe("Variants", () => {
    it("should apply primary variant classes", () => {
      const { container } = render(<Button variant="primary">Primary</Button>);
      const button = container.firstChild as HTMLButtonElement;

      expect(button.className).toContain("bg-primary-500");
      expect(button.className).toContain("text-white");
      expect(button.className).toContain("hover:bg-primary-600");
    });

    it("should apply secondary variant classes", () => {
      const { container } = render(<Button variant="secondary">Secondary</Button>);
      const button = container.firstChild as HTMLButtonElement;

      expect(button.className).toContain("bg-secondary-500");
    });

    it("should apply outline variant classes", () => {
      const { container } = render(<Button variant="outline">Outline</Button>);
      const button = container.firstChild as HTMLButtonElement;

      expect(button.className).toContain("border");
      expect(button.className).toContain("border-gray-300");
    });

    it("should apply ghost variant classes", () => {
      const { container } = render(<Button variant="ghost">Ghost</Button>);
      const button = container.firstChild as HTMLButtonElement;

      expect(button.className).toContain("text-gray-700");
      expect(button.className).toContain("hover:bg-gray-100");
    });

    it("should apply danger variant classes", () => {
      const { container } = render(<Button variant="danger">Danger</Button>);
      const button = container.firstChild as HTMLButtonElement;

      expect(button.className).toContain("bg-red-500");
      expect(button.className).toContain("hover:bg-red-600");
    });

    it("should default to primary variant", () => {
      const { container } = render(<Button>Default</Button>);
      const button = container.firstChild as HTMLButtonElement;

      expect(button.className).toContain("bg-primary-500");
    });
  });

  describe("Sizes", () => {
    it("should apply small size classes", () => {
      const { container } = render(<Button size="sm">Small</Button>);
      const button = container.firstChild as HTMLButtonElement;

      expect(button.className).toContain("px-3");
      expect(button.className).toContain("py-1.5");
      expect(button.className).toContain("text-sm");
    });

    it("should apply medium size classes", () => {
      const { container } = render(<Button size="md">Medium</Button>);
      const button = container.firstChild as HTMLButtonElement;

      expect(button.className).toContain("px-4");
      expect(button.className).toContain("py-2");
    });

    it("should apply large size classes", () => {
      const { container } = render(<Button size="lg">Large</Button>);
      const button = container.firstChild as HTMLButtonElement;

      expect(button.className).toContain("px-6");
      expect(button.className).toContain("py-3");
      expect(button.className).toContain("text-base");
    });

    it("should default to medium size", () => {
      const { container } = render(<Button>Default</Button>);
      const button = container.firstChild as HTMLButtonElement;

      expect(button.className).toContain("px-4");
      expect(button.className).toContain("py-2");
    });
  });

  describe("Loading State", () => {
    it("should show loading spinner when isLoading is true", () => {
      const { container } = render(<Button isLoading>Loading</Button>);
      const button = container.firstChild as HTMLButtonElement;

      const spinner = button.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("should not show children when loading", () => {
      render(<Button isLoading>Loading</Button>);

      expect(screen.queryByText("Loading")).not.toBeInTheDocument();
    });

    it("should disable button when loading", () => {
      const { container } = render(<Button isLoading>Loading</Button>);
      const button = container.firstChild as HTMLButtonElement;

      expect(button.disabled).toBe(true);
    });

    it("should not show icons when loading", () => {
      const { container } = render(
        <Button isLoading leftIcon={<span>←</span>} rightIcon={<span>→</span>}>
          Loading
        </Button>
      );
      const button = container.firstChild as HTMLButtonElement;

      expect(button.textContent).not.toContain("←");
      expect(button.textContent).not.toContain("→");
    });
  });

  describe("Icons", () => {
    it("should render left icon before children", () => {
      render(<Button leftIcon={<span data-testid="left-icon">←</span>}>Click Me</Button>);

      const button = screen.getByText("Click Me").closest("button");
      const leftIcon = screen.getByTestId("left-icon");

      expect(button?.contains(leftIcon)).toBe(true);
      expect(button?.textContent).toContain("←");
    });

    it("should render right icon after children", () => {
      render(<Button rightIcon={<span data-testid="right-icon">→</span>}>Click Me</Button>);

      const button = screen.getByText("Click Me").closest("button");
      const rightIcon = screen.getByTestId("right-icon");

      expect(button?.contains(rightIcon)).toBe(true);
    });

    it("should render both icons", () => {
      render(
        <Button leftIcon={<span data-testid="left">←</span>} rightIcon={<span data-testid="right">→</span>}>
          Click Me
        </Button>
      );

      expect(screen.getByTestId("left")).toBeInTheDocument();
      expect(screen.getByTestId("right")).toBeInTheDocument();
    });
  });

  describe("Disabled State", () => {
    it("should disable button when disabled prop is true", () => {
      const { container } = render(<Button disabled>Disabled</Button>);
      const button = container.firstChild as HTMLButtonElement;

      expect(button.disabled).toBe(true);
    });

    it("should apply disabled styles", () => {
      const { container } = render(<Button disabled>Disabled</Button>);
      const button = container.firstChild as HTMLButtonElement;

      expect(button.className).toContain("disabled:opacity-50");
      expect(button.className).toContain("disabled:cursor-not-allowed");
    });

    it("should be disabled when both disabled and isLoading are true", () => {
      const { container } = render(
        <Button disabled isLoading>
          Button
        </Button>
      );
      const button = container.firstChild as HTMLButtonElement;

      expect(button.disabled).toBe(true);
    });
  });

  describe("Event Handlers", () => {
    it("should call onClick handler", async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);

      const button = screen.getByText("Click Me");
      await userEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("should not call onClick when disabled", async () => {
      const handleClick = jest.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      );

      const button = screen.getByText("Disabled");
      await userEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });

    it("should not call onClick when loading", async () => {
      const handleClick = jest.fn();
      render(
        <Button isLoading onClick={handleClick}>
          Loading
        </Button>
      );

      const button = screen.getByRole("button");
      await userEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("Custom ClassName", () => {
    it("should merge custom className with default classes", () => {
      const { container } = render(<Button className="custom-class">Test</Button>);
      const button = container.firstChild as HTMLButtonElement;

      expect(button.className).toContain("custom-class");
      expect(button.className).toContain("bg-primary-500");
    });
  });

  describe("Base Styles", () => {
    it("should apply base button styles", () => {
      const { container } = render(<Button>Test</Button>);
      const button = container.firstChild as HTMLButtonElement;

      expect(button.className).toContain("inline-flex");
      expect(button.className).toContain("items-center");
      expect(button.className).toContain("justify-center");
      expect(button.className).toContain("font-medium");
      expect(button.className).toContain("rounded-lg");
      expect(button.className).toContain("transition-colors");
    });

    it("should apply focus styles", () => {
      const { container } = render(<Button>Test</Button>);
      const button = container.firstChild as HTMLButtonElement;

      expect(button.className).toContain("focus:outline-none");
      expect(button.className).toContain("focus:ring-2");
      expect(button.className).toContain("focus:ring-offset-2");
    });
  });

  describe("Props Spreading", () => {
    it("should spread additional props to button", () => {
      render(
        <Button data-testid="custom-button" aria-label="Custom">
          Test
        </Button>
      );

      const button = screen.getByTestId("custom-button");
      expect(button).toHaveAttribute("aria-label", "Custom");
    });

    it("should handle type prop", () => {
      render(<Button type="submit">Submit</Button>);

      const button = screen.getByText("Submit");
      expect(button).toHaveAttribute("type", "submit");
    });
  });
});

import { useAppDispatch, useAppSelector } from "../hooks";
import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { store } from "../store";
import React from "react";

// Mock react-redux hooks
jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

describe("store hooks - Whitebox Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should export useAppDispatch hook", () => {
    expect(typeof useAppDispatch).toBe("function");
  });

  it("should export useAppSelector hook", () => {
    expect(typeof useAppSelector).toBe("function");
  });
});


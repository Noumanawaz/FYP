import { renderHook, act } from "@testing-library/react";
import { useSpeechRecognition } from "../useSpeechRecognition";

let lastInstance: MockSpeechRecognition | null = null;

class MockSpeechRecognition {
  public continuous = false;
  public interimResults = false;
  public lang = "en-US";
  public onstart: (() => void) | null = null;
  public onresult: ((event: any) => void) | null = null;
  public onerror: ((event: any) => void) | null = null;
  public onend: (() => void) | null = null;

  start = jest.fn(() => {
    this.onstart?.();
  });

  stop = jest.fn(() => {
    this.onend?.();
  });

  constructor() {
    lastInstance = this;
  }
}

describe("useSpeechRecognition - Whitebox", () => {
  const originalSpeechRecognition = (window as any).SpeechRecognition;
  const originalWebkitSpeechRecognition = (window as any).webkitSpeechRecognition;

  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).SpeechRecognition = MockSpeechRecognition as any;
    (window as any).webkitSpeechRecognition = undefined;
  });

  afterEach(() => {
    (window as any).SpeechRecognition = originalSpeechRecognition;
    (window as any).webkitSpeechRecognition = originalWebkitSpeechRecognition;
    lastInstance = null;
  });

  it("initializes and sets isSupported when SpeechRecognition is available", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isSupported).toBe(true);
  });

  it("returns isSupported false when SpeechRecognition is unavailable", () => {
    (window as any).SpeechRecognition = undefined;
    (window as any).webkitSpeechRecognition = undefined;
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isSupported).toBe(false);
  });

  it("starts listening and updates transcript on final results", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    const recognition = lastInstance;
    expect(recognition).not.toBeNull();

    act(() => {
      result.current.startListening();
    });
    expect(recognition!.start).toHaveBeenCalled();
    expect(result.current.isListening).toBe(true);

    const makeResult = (text: string, isFinal: boolean) =>
      ({
        0: { transcript: text },
        isFinal,
        length: 1,
      } as any);

    act(() => {
      recognition!.onresult?.({
        resultIndex: 0,
        results: [makeResult("hello", true), makeResult(" world", true)],
      });
    });

    expect(result.current.transcript).toBe("hello world");
  });

  it("handles errors and stops listening", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    const recognition = lastInstance;

    act(() => {
      recognition!.onstart?.();
    });
    expect(result.current.isListening).toBe(true);

    act(() => {
      recognition!.onerror?.({ error: "network" });
    });

    expect(result.current.error).toContain("network");
    expect(result.current.isListening).toBe(false);
  });

  it("stops listening when stopListening is called", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    const recognition = lastInstance;

    act(() => {
      result.current.startListening();
    });
    expect(result.current.isListening).toBe(true);

    act(() => {
      result.current.stopListening();
    });

    expect(recognition!.stop).toHaveBeenCalled();
    expect(result.current.isListening).toBe(false);
  });
});

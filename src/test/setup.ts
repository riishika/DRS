import "@testing-library/jest-dom/vitest";

class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (!("ResizeObserver" in globalThis)) {
  // Recharts relies on ResizeObserver in layout-driven components.
  (globalThis as typeof globalThis & { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver = ResizeObserverMock;
}

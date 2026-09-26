export interface CoinController {
  setActive(active: boolean): void;
  pointer(x: number, y: number): void;
  resize(): void;
  dispose(): void;
}

export function mountCoin(canvas: HTMLCanvasElement, options?: { getScroll?: () => number }): Promise<CoinController>;

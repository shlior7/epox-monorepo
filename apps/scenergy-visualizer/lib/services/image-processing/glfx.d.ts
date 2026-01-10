/**
 * Type declarations for glfx.js WebGL image processing library
 */

declare module 'glfx' {
  interface GlfxCanvas extends HTMLCanvasElement {
    texture(image: HTMLImageElement | HTMLCanvasElement): GlfxTexture;
    draw(texture: GlfxTexture, width?: number, height?: number): GlfxCanvas;
    update(): GlfxCanvas;

    // Adjust filters
    brightnessContrast(brightness: number, contrast: number): GlfxCanvas;
    hueSaturation(hue: number, saturation: number): GlfxCanvas;
    vibrance(amount: number): GlfxCanvas;
    sepia(amount: number): GlfxCanvas;
    colorHalftone(centerX: number, centerY: number, angle: number, size: number): GlfxCanvas;
    triangleBlur(radius: number): GlfxCanvas;
    unsharpMask(radius: number, strength: number): GlfxCanvas;
    denoise(exponent: number): GlfxCanvas;
    noise(amount: number): GlfxCanvas;
    vignette(size: number, amount: number): GlfxCanvas;
    lensBlur(radius: number, brightness: number, angle: number): GlfxCanvas;
    tiltShift(
      startX: number,
      startY: number,
      endX: number,
      endY: number,
      blurRadius: number,
      gradientRadius: number
    ): GlfxCanvas;
    zoomBlur(centerX: number, centerY: number, strength: number): GlfxCanvas;

    // Curve filters
    curves(
      red: [number, number][],
      green?: [number, number][],
      blue?: [number, number][]
    ): GlfxCanvas;

    // Fun filters
    dotScreen(centerX: number, centerY: number, angle: number, size: number): GlfxCanvas;
    edgeWork(radius: number): GlfxCanvas;
    hexagonalPixelate(centerX: number, centerY: number, scale: number): GlfxCanvas;
    ink(strength: number): GlfxCanvas;

    // Warp filters
    bulgePinch(
      centerX: number,
      centerY: number,
      radius: number,
      strength: number
    ): GlfxCanvas;
    matrixWarp(matrix: number[], inverse?: boolean, useTextureSpace?: boolean): GlfxCanvas;
    perspective(
      before: [number, number, number, number, number, number, number, number],
      after: [number, number, number, number, number, number, number, number]
    ): GlfxCanvas;
    swirl(centerX: number, centerY: number, radius: number, angle: number): GlfxCanvas;

    // Internal
    _: {
      gl: WebGLRenderingContext;
    };
  }

  interface GlfxTexture {
    destroy(): void;
    loadContentsOf(image: HTMLImageElement | HTMLCanvasElement): void;
  }

  function canvas(): GlfxCanvas;
}

/**
 * Capture page thumbnail as base64 data URL
 */
export async function capturePageThumbnail(): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Set thumbnail size
    const width = 320;
    const height = 180;
    canvas.width = width;
    canvas.height = height;

    // Use Chrome's capture API if available
    if (chrome.tabs?.captureVisibleTab) {
      return new Promise((resolve) => {
        chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
          if (chrome.runtime.lastError || !dataUrl) {
            resolve('');
            return;
          }

          // Resize the captured image
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/png'));
          };
          img.onerror = () => resolve('');
          img.src = dataUrl;
        });
      });
    }

    // Fallback: render page to canvas (limited support)
    return '';
  } catch {
    return '';
  }
}

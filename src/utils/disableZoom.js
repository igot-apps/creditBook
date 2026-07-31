export const disableZoom = () => {
  // 1. Prevent Pinch-to-Zoom (Multi-touch)
  document.addEventListener('touchstart', (event) => {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  }, { passive: false });

  // 2. Prevent Double-Tap-to-Zoom
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  // 3. Prevent iOS specific gesture zoom
  document.addEventListener('gesturestart', (event) => {
    event.preventDefault();
  }, { passive: false });

  // 4. Prevent Desktop Trackpad Pinch Zoom (Ctrl + Scroll)
  document.addEventListener('wheel', (event) => {
    if (event.ctrlKey) {
      event.preventDefault();
    }
  }, { passive: false });
};
export const disableBounce = () => {
  let startY = 0;
  let currentY = 0;
  let isScrolling = false;

  const onTouchStart = (e) => {
    startY = e.touches[0].pageY;
    currentY = startY;
    isScrolling = false;
  };

  const onTouchMove = (e) => {
    currentY = e.touches[0].pageY;
    isScrolling = true;
  };

  const onTouchEnd = (e) => {
    if (!isScrolling) return;
    
    const deltaY = currentY - startY;
    const body = document.body;
    const html = document.documentElement;
    
    // If at the top of the page and pulling down, prevent it
    if (window.scrollY === 0 && deltaY > 0) {
      e.preventDefault();
    }
    
    // If at the bottom of the page and pulling up, prevent it
    const atBottom = html.scrollHeight - html.scrollTop === html.clientHeight;
    if (atBottom && deltaY < 0) {
      e.preventDefault();
    }
  };

  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchmove', onTouchMove, { passive: true });
  document.addEventListener('touchend', onTouchEnd, { passive: false });

  // Also prevent the iOS overscroll on the body itself
  document.body.addEventListener('touchmove', (e) => {
    if (e.target.closest('#root')) return; // Allow scrolling inside #root
    e.preventDefault();
  }, { passive: false });
};
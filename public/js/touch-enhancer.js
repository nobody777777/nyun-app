// Touch Enhancer untuk Chart
document.addEventListener('DOMContentLoaded', function() {
  let touchStartX = 0;
  let touchStartY = 0;
  
  // Fungsi untuk mendeteksi gerakan touch
  function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
  
  function handleTouchMove(e) {
    if (!touchStartX || !touchStartY) {
      return;
    }
    
    const touchEndX = e.touches[0].clientX;
    const touchEndY = e.touches[0].clientY;
    
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;
    
    // Jika gerakan horizontal lebih dominan
    if (Math.abs(diffX) > Math.abs(diffY)) {
      e.preventDefault(); // Mencegah scroll horizontal
    }
    
    touchStartX = null;
    touchStartY = null;
  }
  
  // Menambahkan event listener ke chart container
  const chartContainers = document.querySelectorAll('.chart-wrapper');
  chartContainers.forEach(container => {
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
  });
}); 
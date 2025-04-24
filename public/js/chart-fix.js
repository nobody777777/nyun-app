// Script untuk memastikan Chart.js diinisialisasi dengan benar di production

// Fungsi untuk memastikan chart dirender dengan benar
function ensureChartRendered() {
  console.log('[chart-fix.js] Checking for chart canvas...');
  
  // Cek apakah chart canvas sudah ada
  const checkCanvas = () => {
    const chartCanvas = document.querySelector('.chart-canvas');
    if (chartCanvas) {
      console.log('[chart-fix.js] Chart canvas found, triggering resize');
      // Trigger resize event untuk memastikan chart dirender dengan benar
      window.dispatchEvent(new Event('resize'));
      
      // Coba akses chart instance jika ada
      if (chartCanvas.__chartjs) {
        console.log('[chart-fix.js] Chart instance found, updating');
        chartCanvas.__chartjs.update('none');
        return;
      }
    } 
    
    // Batasi retry maksimal 3 kali
    if (typeof checkCanvas.retryCount === 'undefined') {
      checkCanvas.retryCount = 0;
    }
    
    if (checkCanvas.retryCount < 3) {
      checkCanvas.retryCount++;
      console.log(`[chart-fix.js] Chart canvas not found, retry ${checkCanvas.retryCount}/3`);
      setTimeout(checkCanvas, 300);
    } else {
      console.log('[chart-fix.js] Max retries reached, giving up');
    }
  };
  
  // Mulai pengecekan setelah DOM selesai dimuat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(checkCanvas, 500);
    });
  } else {
    setTimeout(checkCanvas, 500);
  }
}

// Jalankan fungsi saat halaman dimuat
window.addEventListener('load', ensureChartRendered);

// Jalankan fungsi saat navigasi halaman (untuk Next.js)
if (typeof window !== 'undefined' && window.next) {
  window.next.router.events.on('routeChangeComplete', ensureChartRendered);
}
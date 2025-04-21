// Mobile Fullscreen Handler
document.addEventListener('DOMContentLoaded', function() {
  // Fungsi untuk menangani perubahan orientasi
  function handleOrientationChange() {
    const isLandscape = window.matchMedia("(orientation: landscape)").matches;
    const fullscreenElements = document.querySelectorAll('.chart-fullscreen-active');
    
    fullscreenElements.forEach(element => {
      if (isLandscape) {
        // Ubah styling untuk memungkinkan scrolling
        element.style.height = 'auto';
        element.style.minHeight = '100vh';
        element.style.width = '100vw';
        element.style.overflowY = 'auto';
        element.style.overflowX = 'hidden';
        
        // Styling untuk container chart
        const chartWrapper = element.querySelector('.chart-wrapper');
        if (chartWrapper) {
          chartWrapper.style.height = 'auto';
          chartWrapper.style.minHeight = 'auto';
          chartWrapper.style.paddingBottom = '100px';
          chartWrapper.style.overflow = 'visible';
        }
        
        // Styling untuk canvas chart
        const chartCanvas = element.querySelector('.chart-canvas');
        if (chartCanvas) {
          chartCanvas.style.marginBottom = '80px';
        }
        
        // Styling untuk container tools saat fullscreen
        const toolsContainer = element.querySelector('.chart-tools');
        if (toolsContainer) {
          // Styling container utama
          toolsContainer.style.position = 'fixed';
          toolsContainer.style.top = '10px';
          toolsContainer.style.left = '50%';
          toolsContainer.style.transform = 'translateX(-50%)';
          toolsContainer.style.zIndex = '9999';
          toolsContainer.style.background = 'rgb(255, 255, 255)';
          toolsContainer.style.padding = '8px 15px';
          toolsContainer.style.borderRadius = '8px';
          toolsContainer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
          toolsContainer.style.display = 'flex';
          toolsContainer.style.gap = '10px';
          toolsContainer.style.flexWrap = 'wrap';
          toolsContainer.style.justifyContent = 'center';
          toolsContainer.style.alignItems = 'center';
          toolsContainer.style.maxWidth = '90vw';

          // Styling untuk semua tombol di dalam tools
          const buttons = toolsContainer.querySelectorAll('button');
          buttons.forEach(button => {
            button.style.padding = '8px 15px';
            button.style.margin = '2px';
            button.style.borderRadius = '5px';
            button.style.fontSize = '14px';
            button.style.whiteSpace = 'nowrap';
          });
        }

        // Styling khusus untuk tombol fullscreen
        const fullscreenButton = element.querySelector('.fullscreen-button');
        if (fullscreenButton) {
          fullscreenButton.style.position = 'fixed';
          fullscreenButton.style.top = '10px';
          fullscreenButton.style.right = '10px';
          fullscreenButton.style.zIndex = '10000';
          fullscreenButton.style.background = 'rgba(255, 255, 255, 0.95)';
          fullscreenButton.style.padding = '8px';
          fullscreenButton.style.borderRadius = '5px';
          fullscreenButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
        }
        
        // Tidak perlu menambahkan spacer karena kita hanya ingin scroll sampai tanggal saja
      } else {
        // Tampilkan peringatan jika dalam mode portrait
        const warning = element.querySelector('.orientation-warning');
        if (warning) {
          warning.style.display = 'block';
        }
      }
    });
  }

  // Menangani perubahan orientasi
  window.addEventListener('orientationchange', function() {
    setTimeout(handleOrientationChange, 100);
  });

  // Menangani resize window
  window.addEventListener('resize', function() {
    if (document.fullscreenElement) {
      handleOrientationChange();
    }
  });

  // Menangani exit fullscreen
  document.addEventListener('fullscreenchange', function() {
    if (!document.fullscreenElement) {
      const fullscreenElements = document.querySelectorAll('.chart-fullscreen-active');
      fullscreenElements.forEach(element => {
        element.classList.remove('chart-fullscreen-active');
        const warning = element.querySelector('.orientation-warning');
        if (warning) {
          warning.style.display = 'none';
        }
        
        // Reset styling tools saat keluar dari fullscreen
        const toolsContainer = element.querySelector('.chart-tools');
        if (toolsContainer) {
          toolsContainer.style = '';
          const buttons = toolsContainer.querySelectorAll('button');
          buttons.forEach(button => {
            button.style = '';
          });
        }

        // Reset styling tombol fullscreen
        const fullscreenButton = element.querySelector('.fullscreen-button');
        if (fullscreenButton) {
          fullscreenButton.style = '';
        }
      });
      
      // Perbaikan penanganan unlock orientasi
      try {
        if (screen.orientation && 
            typeof screen.orientation.unlock === 'function') {
          screen.orientation.unlock()
            .catch(error => console.log('Gagal unlock orientasi:', error));
        }
      } catch (error) {
        console.log('Error saat mencoba unlock orientasi:', error);
      }
    }
  });
}); 
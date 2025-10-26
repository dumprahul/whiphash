// WhipHash Extension - Embedded Website Version

let currentUrl = 'http://localhost:3000';
let iframe = null;
let loadingEl = null;
let errorEl = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔧 WhipHash extension popup loaded');
  
  iframe = document.getElementById('whiphashFrame');
  loadingEl = document.getElementById('loading');
  errorEl = document.getElementById('error');
  
  // Set up control buttons
  document.getElementById('refreshBtn').addEventListener('click', refreshApp);
  document.getElementById('fullscreenBtn').addEventListener('click', openFullscreen);
  
  // Load the app
  loadApp();
});

function loadApp() {
  console.log('🚀 Loading WhipHash app...');
  
  // Show loading
  loadingEl.style.display = 'block';
  errorEl.style.display = 'none';
  iframe.style.display = 'none';
  
  // Try to load the app
  const urls = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3000/test',
    'http://127.0.0.1:3000/test'
  ];
  
  let urlIndex = 0;
  
  function tryNextUrl() {
    if (urlIndex >= urls.length) {
      showError();
      return;
    }
    
    currentUrl = urls[urlIndex];
    console.log(`🔍 Trying URL ${urlIndex + 1}/${urls.length}: ${currentUrl}`);
    
    iframe.src = currentUrl;
    
    // Set up iframe load handlers
    iframe.onload = () => {
      console.log(`✅ Successfully loaded ${currentUrl}`);
      loadingEl.style.display = 'none';
      errorEl.style.display = 'none';
      iframe.style.display = 'block';
    };
    
    iframe.onerror = () => {
      console.error(`❌ Failed to load ${currentUrl}`);
      urlIndex++;
      setTimeout(tryNextUrl, 1000); // Try next URL after 1 second
    };
    
    // Timeout fallback
    setTimeout(() => {
      if (loadingEl.style.display !== 'none') {
        console.error(`⏰ Timeout loading ${currentUrl}`);
        urlIndex++;
        tryNextUrl();
      }
    }, 5000);
  }
  
  tryNextUrl();
}

function refreshApp() {
  console.log('🔄 Refreshing app...');
  loadApp();
}

function openFullscreen() {
  console.log('⛶ Opening fullscreen...');
  chrome.tabs.create({ 
    url: currentUrl
  });
}

function showError() {
  console.error('❌ All URLs failed');
  loadingEl.style.display = 'none';
  errorEl.style.display = 'block';
  iframe.style.display = 'none';
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
    e.preventDefault();
    refreshApp();
  } else if (e.key === 'F11') {
    e.preventDefault();
    openFullscreen();
  }
});

// Debug info
console.log('🔧 Chrome version:', navigator.userAgent);
console.log('🔧 Extension ID:', chrome.runtime.id);
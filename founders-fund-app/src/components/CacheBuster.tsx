'use client';

import { useEffect, useState } from 'react';

export default function CacheBuster() {
  const [version, setVersion] = useState<string>('loading');

  useEffect(() => {
    // Force cache bust with timestamp
    const timestamp = Date.now();
    console.log(`🔄 Cache Buster Active - Version: ${timestamp}`);

    // Set version for display
    setVersion(timestamp.toString().slice(-6));

    // Add version to window for debugging
    (window as any).APP_VERSION = timestamp;

    // Clear any existing service worker cache
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister();
        });
      });
    }

    // Clear browser cache for this domain
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: '#ff9800',
      color: 'white',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999
    }}>
      🔄 Debug v{version}
    </div>
  );
}
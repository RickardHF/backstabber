// Debug utility to check sprite loading in different environments

export const debugSpriteLoading = async () => {
  
  console.log('Environment check:');
  console.log('- Window location:', typeof window !== 'undefined' ? window.location.href : 'Server side');
  console.log('- Base URL:', typeof window !== 'undefined' ? window.location.origin : 'Unknown');
  
  if (typeof window !== 'undefined') {
    // Test different sprite paths
    const pathsToTest = [
      '/sprites/charactersprites.png',
      `${window.location.origin}/sprites/charactersprites.png`,
      './sprites/charactersprites.png',
      '/public/sprites/charactersprites.png'
    ];
    
    console.log('Testing sprite paths:');
    
    for (const path of pathsToTest) {
      try {
        const response = await fetch(path, { method: 'HEAD' });
        console.log(`✅ ${path} - Status: ${response.status}`);
        
        if (response.ok) {
          console.log(`🎯 Working sprite path found: ${path}`);
          return path;
        }
      } catch (error) {
        console.log(`❌ ${path} - Error:`, error);
      }
    }
    
    console.log('⚠️ No working sprite paths found, will use procedural generation');
  }
  
  return null;
};

export const testSpriteLoad = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      console.log(`✅ Sprite loaded successfully: ${url}`);
      resolve(true);
    };
    img.onerror = (error) => {
      console.log(`❌ Sprite failed to load: ${url}`, error);
      resolve(false);
    };
    img.src = url;
  });
};

// Debug utility to check sprite loading in different environments

export const debugSpriteLoading = async () => {
  
  console.log('Environment check:');
  console.log('- Window location:', typeof window !== 'undefined' ? window.location.href : 'Server side');
  console.log('- Base URL:', typeof window !== 'undefined' ? window.location.origin : 'Unknown');
  
  if (typeof window !== 'undefined') {
    // Test different sprite paths for both character and enemy sprites
    const spritesToTest = [
      { name: 'Character Sprites', paths: [
        '/sprites/charactersprites.png',
        `${window.location.origin}/sprites/charactersprites.png`,
        './sprites/charactersprites.png',
        '/public/sprites/charactersprites.png'
      ]},
      { name: 'Enemy Sprites', paths: [
        '/sprites/enemysprites.png',
        `${window.location.origin}/sprites/enemysprites.png`,
        './sprites/enemysprites.png',
        '/public/sprites/enemysprites.png'
      ]}
    ];
    
    console.log('Testing sprite paths:');
    
    const workingPaths: { [key: string]: string } = {};
    
    for (const spriteGroup of spritesToTest) {
      console.log(`\n--- Testing ${spriteGroup.name} ---`);
      
      for (const path of spriteGroup.paths) {
        try {
          const response = await fetch(path, { method: 'HEAD' });
          console.log(`✅ ${path} - Status: ${response.status}`);
          
          if (response.ok) {
            console.log(`🎯 Working ${spriteGroup.name.toLowerCase()} path found: ${path}`);
            const key = spriteGroup.name === 'Character Sprites' ? 'character' : 'enemy';
            workingPaths[key] = path;
            break;
          }
        } catch (error) {
          console.log(`❌ ${path} - Error:`, error);
        }
      }
    }
    
    if (Object.keys(workingPaths).length === 0) {
      console.log('⚠️ No working sprite paths found, will use procedural generation');
      return null;
    } else {
      console.log('📋 Working sprite paths summary:', workingPaths);
      return workingPaths;
    }
  }
  
  return null;
};

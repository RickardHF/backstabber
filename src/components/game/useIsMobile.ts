import { useState, useEffect } from 'react';

export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkIsMobile = () => {
      // Check for touch support
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Check for mobile user agent
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileKeywords = [
        'mobile', 'android', 'iphone', 'ipad', 'ipod', 
        'blackberry', 'windows phone', 'opera mini'
      ];
      const isMobileUserAgent = mobileKeywords.some(keyword => 
        userAgent.includes(keyword)
      );
      
      // Check for small screen size
      const isSmallScreen = window.innerWidth <= 768;
      
      // Consider it mobile if it has touch AND (is mobile user agent OR small screen)
      setIsMobile(hasTouch && (isMobileUserAgent || isSmallScreen));
    };
    
    checkIsMobile();
    
    // Re-check on window resize
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);
  
  return isMobile;
};

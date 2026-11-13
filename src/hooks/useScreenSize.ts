import { useState, useEffect } from 'react';

export interface ScreenSize {
  width: number;
  height: number;
  isMobile: boolean;
  isSmallMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
}

export function useScreenSize(): ScreenSize {
  const getSize = (): ScreenSize => {
    if (typeof window === 'undefined') {
      return {
        width: 1024,
        height: 768,
        isMobile: false,
        isSmallMobile: false,
        isTablet: false,
        isDesktop: true,
        isLandscape: true,
      };
    }

    const width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

    return {
      width,
      height,
      isMobile: width < 768,
      isSmallMobile: width < 385,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
      isLandscape: width > height && height < 500,
    };
  };

  const [screenSize, setScreenSize] = useState<ScreenSize>(getSize);

  useEffect(() => {
    const handleResize = () => {
      setScreenSize(getSize());
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return screenSize;
}

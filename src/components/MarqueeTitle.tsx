import React, { useEffect, useRef, useState } from 'react';

interface MarqueeTitleProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
  centered?: boolean;
}

export const MarqueeTitle: React.FC<MarqueeTitleProps> = ({
  text,
  className = '',
  style = {},
  as: Component = 'div',
  centered = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<any>(null);
  const [overflowX, setOverflowX] = useState<number>(0);

  useEffect(() => {
    const updateOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerW = containerRef.current.clientWidth;
        const textW = textRef.current.scrollWidth;
        if (textW > containerW + 4) {
          setOverflowX(textW - containerW + 12);
        } else {
          setOverflowX(0);
        }
      }
    };

    updateOverflow();
    // Allow small delay for custom web font load & layout computation
    const timer = setTimeout(updateOverflow, 80);
    window.addEventListener('resize', updateOverflow);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateOverflow);
    };
  }, [text]);

  const isOverflowing = overflowX > 0;
  // Natural audio deck scroll speed: ~25 px/second + pauses at start & end
  const duration = Math.max(5, Math.round((overflowX / 26) + 3.5));

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden max-w-full min-w-0 ${
        centered && !isOverflowing ? 'flex justify-center' : ''
      }`}
    >
      <Component
        ref={textRef}
        className={`inline-block whitespace-nowrap will-change-transform ${
          isOverflowing ? 'animate-marquee-pingpong' : ''
        } ${className}`}
        style={{
          ...style,
          ...(isOverflowing
            ? ({
                '--marquee-distance': `-${overflowX}px`,
                '--marquee-duration': `${duration}s`,
              } as React.CSSProperties)
            : {}),
        }}
      >
        {text}
      </Component>
    </div>
  );
};

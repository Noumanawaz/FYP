import React, { useRef, useEffect, useState } from 'react';
import { useSprings, animated } from '@react-spring/web';

interface BlurTextProps {
  text: string;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
  animateBy?: 'words' | 'letters';
  direction?: 'top' | 'bottom';
  onAnimationComplete?: () => void;
}

const BlurText: React.FC<BlurTextProps> = ({
  text,
  delay = 200,
  className = '',
  style,
  animateBy = 'words',
  direction = 'top',
  onAnimationComplete,
}) => {
  const elements = animateBy === 'words' ? text.split(' ') : text.split('');
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  const animatedCount = useRef(0);

  // default animations setup
  const defaultFrom = { filter: 'blur(10px)', opacity: 0, transform: direction === 'top' ? 'translate3d(0,-50px,0)' : 'translate3d(0,50px,0)' };
  const defaultTo = [
    { filter: 'blur(5px)', opacity: 0.5, transform: direction === 'top' ? 'translate3d(0,5px,0)' : 'translate3d(0,-5px,0)' },
    { filter: 'blur(0px)', opacity: 1, transform: 'translate3d(0,0,0)' }
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        if (ref.current) observer.unobserve(ref.current);
      }
    }, { threshold: 0.1, rootMargin: '-50px' });
    
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const springs = useSprings(
    elements.length,
    elements.map((_, i) => ({
      from: defaultFrom,
      to: inView ? async (next: any) => {
        for (const step of defaultTo) {
          await next(step);
        }
        animatedCount.current += 1;
        if (animatedCount.current === elements.length && onAnimationComplete) {
          onAnimationComplete();
        }
      } : defaultFrom,
      delay: i * delay,
      config: { mass: 1, tension: 120, friction: 14 },
    }))
  );

  return (
    <p ref={ref} className={`inline-flex flex-wrap m-0 justify-center w-full ${className}`} style={style}>
      {springs.map((props, index) => (
        <animated.span
          key={index}
          style={props as any}
          className="inline-block transition-transform will-change-[transform,filter,opacity]"
        >
          {elements[index] === ' ' ? '\u00A0' : elements[index]}
          {animateBy === 'words' && index < elements.length - 1 && '\u00A0'}
        </animated.span>
      ))}
    </p>
  );
};

export default BlurText;

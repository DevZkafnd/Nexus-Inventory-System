import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

const DEFAULT_FROM = { opacity: 0, y: 20 };
const DEFAULT_TO = { opacity: 1, y: 0 };

const SplitText = ({
  text,
  className = '',
  delay = 0, // in ms
  duration = 0.5, // in s (GSAP default)
  ease = 'power2.out',
  splitType = 'chars', // 'chars', 'words'
  from = DEFAULT_FROM,
  to = DEFAULT_TO,
  threshold = 0.1,
  rootMargin = '-50px',
  textAlign = 'left',
  onLetterAnimationComplete,
}) => {
  const elementRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const lettersRef = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  useEffect(() => {
    if (isVisible && lettersRef.current.length > 0) {
      // Clear any previous animations
      gsap.killTweensOf(lettersRef.current);

      // Reset to 'from' state
      gsap.set(lettersRef.current, from);

      const ctx = gsap.context(() => {
        gsap.to(lettersRef.current, {
          ...to,
          duration,
          ease,
          stagger: 0.05,
          delay: delay / 1000, // convert ms to s
          onComplete: () => {
            if (onLetterAnimationComplete) onLetterAnimationComplete();
          },
        });
      }, elementRef);

      return () => ctx.revert();
    }
  }, [isVisible, from, to, duration, ease, delay, onLetterAnimationComplete]);

  const renderContent = () => {
    lettersRef.current = []; // Reset refs
    
    if (splitType === 'words') {
      return text.split(' ').map((word, i) => (
        <span
          key={i}
          style={{ display: 'inline-block', whiteSpace: 'pre' }}
          ref={(el) => {
            if (el) lettersRef.current.push(el);
          }}
        >
          {word}{i < text.split(' ').length - 1 ? ' ' : ''}
        </span>
      ));
    }

    // Default to chars
    return text.split('').map((char, i) => (
      <span
        key={i}
        style={{ display: 'inline-block', whiteSpace: 'pre' }}
        ref={(el) => {
          if (el) lettersRef.current.push(el);
        }}
      >
        {char}
      </span>
    ));
  };

  return (
    <div
      ref={elementRef}
      className={className}
      style={{ textAlign, overflow: 'hidden' }}
    >
      {renderContent()}
    </div>
  );
};

export default React.memo(SplitText);

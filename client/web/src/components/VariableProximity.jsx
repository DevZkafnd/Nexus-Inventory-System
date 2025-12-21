import { forwardRef, useMemo, useRef, useEffect } from 'react';
// import { motion } from 'motion/react'; // Removed unused import
import './VariableProximity.css';

function useAnimationFrame(callback) {
  useEffect(() => {
    let frameId;
    const loop = () => {
      callback();
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [callback]);
}

function useMousePositionRef(containerRef) {
  const positionRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const updatePosition = (x, y) => {
      if (containerRef?.current) {
        const rect = containerRef.current.getBoundingClientRect();
        positionRef.current = { x: x - rect.left, y: y - rect.top };
      } else {
        positionRef.current = { x, y };
      }
    };

    const handleMouseMove = ev => updatePosition(ev.clientX, ev.clientY);
    const handleTouchMove = ev => {
      const touch = ev.touches[0];
      updatePosition(touch.clientX, touch.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [containerRef]);

  return positionRef;
}

const VariableProximity = forwardRef((props, ref) => {
  const {
    label,
    fromFontVariationSettings,
    toFontVariationSettings,
    containerRef,
    radius = 50,
    falloff = 'linear',
    className = '',
    onClick,
    style,
    ...restProps
  } = props;

  const letterRefs = useRef([]);
  const letterRectsRef = useRef([]); // Cache for letter positions
  const letterColorStateRef = useRef([]); // Track color state: false (default) or true (white)
  const interpolatedSettingsRef = useRef([]);
  const mousePositionRef = useMousePositionRef(containerRef);
  const lastPositionRef = useRef({ x: null, y: null });

  useEffect(() => {
    const calculateRects = () => {
      if (!containerRef?.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      letterRectsRef.current = letterRefs.current.map(letterRef => {
        if (!letterRef) return null;
        const rect = letterRef.getBoundingClientRect();
        return {
          centerX: rect.left + rect.width / 2 - containerRect.left,
          centerY: rect.top + rect.height / 2 - containerRect.top
        };
      });
    };

    calculateRects();
    window.addEventListener('resize', calculateRects);
    return () => window.removeEventListener('resize', calculateRects);
  }, [containerRef, label]); // Recalculate on mount/resize/text change

  const parsedSettings = useMemo(() => {
    const parseSettings = settingsStr =>
      new Map(
        settingsStr
          .split(',')
          .map(s => s.trim())
          .map(s => {
            const [name, value] = s.split(' ');
            return [name.replace(/['"]/g, ''), parseFloat(value)];
          })
      );

    const fromSettings = parseSettings(fromFontVariationSettings);
    const toSettings = parseSettings(toFontVariationSettings);

    return Array.from(fromSettings.entries()).map(([axis, fromValue]) => ({
      axis,
      fromValue,
      toValue: toSettings.get(axis) ?? fromValue
    }));
  }, [fromFontVariationSettings, toFontVariationSettings]);

  const calculateFalloff = distance => {
    const norm = Math.min(Math.max(1 - distance / radius, 0), 1);
    switch (falloff) {
      case 'exponential':
        return norm ** 2;
      case 'gaussian':
        return Math.exp(-((distance / (radius / 2)) ** 2) / 2);
      case 'linear':
      default:
        return norm;
    }
  };

  // Pre-calculate radius squared to avoid Math.sqrt in loop
  const radiusSq = radius * radius;

  useAnimationFrame(() => {
    if (!containerRef?.current) return;
    const { x, y } = mousePositionRef.current;
    
    // Check if mouse has moved
    if (lastPositionRef.current.x === x && lastPositionRef.current.y === y) {
      return;
    }
    lastPositionRef.current = { x, y };

    letterRefs.current.forEach((letterRef, index) => {
      if (!letterRef) return;
      const rectData = letterRectsRef.current[index];
      if (!rectData) return;

      // Calculate squared distance
      const dx = x - rectData.centerX;
      const dy = y - rectData.centerY;
      const distSq = dx * dx + dy * dy;

      if (distSq >= radiusSq) {
        if (letterRef.style.fontVariationSettings !== fromFontVariationSettings) {
             letterRef.style.fontVariationSettings = fromFontVariationSettings;
        }
        if (letterColorStateRef.current[index]) {
             letterRef.style.color = '';
             letterColorStateRef.current[index] = false;
        }
        return;
      }

      // Only calculate sqrt if within radius
      const distance = Math.sqrt(distSq);
      const falloffValue = calculateFalloff(distance);
      
      const newSettings = parsedSettings
        .map(({ axis, fromValue, toValue }) => {
          const interpolatedValue = fromValue + (toValue - fromValue) * falloffValue;
          return `'${axis}' ${interpolatedValue.toFixed(2)}`;
        })
        .join(', ');

      if (interpolatedSettingsRef.current[index] !== newSettings) {
        interpolatedSettingsRef.current[index] = newSettings;
        letterRef.style.fontVariationSettings = newSettings;
      }

      if (!letterColorStateRef.current[index]) {
        letterRef.style.color = '#ffffff';
        letterColorStateRef.current[index] = true;
      }
    });
  });

  const words = label.split(' ');
  let letterIndex = 0;

  return (
    <span
      ref={ref}
      className={`${className} variable-proximity`}
      onClick={onClick}
      style={style}
      {...restProps}
    >
      {words.map((word, wordIndex) => (
        <span key={wordIndex} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
          {word.split('').map(letter => {
            const currentLetterIndex = letterIndex++;
            return (
              <span
                key={currentLetterIndex}
                ref={el => {
                  letterRefs.current[currentLetterIndex] = el;
                }}
                style={{
                  display: 'inline-block',
                  willChange: 'font-variation-settings, color',
                  transition: 'color 200ms ease',
                  fontVariationSettings: interpolatedSettingsRef.current[currentLetterIndex]
                }}
                aria-hidden="true"
              >
                {letter}
              </span>
            );
          })}
          {wordIndex < words.length - 1 && <span style={{ display: 'inline-block' }}>&nbsp;</span>}
        </span>
      ))}
      <span className="sr-only">{label}</span>
    </span>
  );
});

VariableProximity.displayName = 'VariableProximity';
export default VariableProximity;
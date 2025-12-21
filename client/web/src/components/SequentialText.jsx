import React, { useState, memo } from 'react';
import SplitText from './SplitText';
import VariableProximity from './VariableProximity';

const SequentialText = memo(({
  text,
  className = '',
  splitDelay = 0,
  containerRef,
  fromFontVariationSettings = "'wght' 400, 'opsz' 9",
  toFontVariationSettings = "'wght' 1000, 'opsz' 40",
  radius = 100,
  falloff = 'linear'
}) => {
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  // If animation is complete, show the VariableProximity component
  if (isAnimationComplete) {
    return (
      <VariableProximity
        label={text}
        className={className}
        fromFontVariationSettings={fromFontVariationSettings}
        toFontVariationSettings={toFontVariationSettings}
        containerRef={containerRef}
        radius={radius}
        falloff={falloff}
        style={{ display: 'block' }} // Default to block to match SplitText wrapper, can be overridden via style prop if needed
      />
    );
  }

  // Otherwise show the SplitText component
  return (
    <SplitText
      text={text}
      className={className}
      delay={splitDelay}
      duration={0.6}
      ease="power3.out"
      splitType="chars" // Match VariableProximity which works on chars
      textAlign="center"
      onLetterAnimationComplete={() => setIsAnimationComplete(true)}
    />
  );
});

export default SequentialText;
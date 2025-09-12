import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TypewriterMessageProps {
  text: string;
  speed?: number; // millisecondi tra ogni carattere
  onComplete?: () => void;
  isComplete?: boolean; // per messaggi già completi (history)
}

export const TypewriterMessage: React.FC<TypewriterMessageProps> = ({
  text,
  speed = 30, // velocità di scrittura
  onComplete,
  isComplete = false
}) => {
  const [displayedText, setDisplayedText] = useState(isComplete ? text : '');
  const [currentIndex, setCurrentIndex] = useState(isComplete ? text.length : 0);

  useEffect(() => {
    if (isComplete || currentIndex >= text.length) {
      if (onComplete && currentIndex >= text.length) {
        onComplete();
      }
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedText(text.slice(0, currentIndex + 1));
      setCurrentIndex(currentIndex + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [currentIndex, text, speed, onComplete, isComplete]);

  return (
    <span className="markdown-body">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
      >
        {displayedText}
      </ReactMarkdown>
    </span>
  );
};

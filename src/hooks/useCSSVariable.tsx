'use client'
import { useEffect, useState } from 'react';

const useCSSVariable = (variableName: string, fallback: string = '') => {
  const [value, setValue] = useState<string>(fallback);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const getCSSVariable = () => {
      const root = document.documentElement;
      return getComputedStyle(root).getPropertyValue(variableName).trim();
    };

    const updateValue = () => {
      const newValue = getCSSVariable();
      if (newValue || !value) { // Update if we get a value or haven't set one yet
        setValue(newValue || fallback);
      }
    };

    // Retry logic for when CSS hasn't loaded yet
    const initialUpdate = () => {
      updateValue();
      
      // If no value found, retry after a short delay
      const currentValue = getCSSVariable();
      if (!currentValue) {
        setTimeout(updateValue, 100);
      }
    };

    initialUpdate();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'data-theme') {
          updateValue();
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, [variableName, fallback]);

  return value;
};

export default useCSSVariable;

// Lazy Loading Hook for performance optimization
// Loads content only when it enters the viewport

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseLazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export const useLazyLoad = <T>(
  loadFn: () => Promise<T>,
  options: UseLazyLoadOptions = {}
) => {
  const { threshold = 0.1, rootMargin = '100px', triggerOnce = true } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  
  const ref = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Setup intersection observer
  useEffect(() => {
    if (!ref.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
          if (triggerOnce && observerRef.current) {
            observerRef.current.disconnect();
          }
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observerRef.current.observe(ref.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce]);

  // Load data when in view
  useEffect(() => {
    if (!isInView || hasLoaded) return;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await loadFn();
        setData(result);
        setHasLoaded(true);
      } catch (err: any) {
        setError(err.message || 'Failed to load');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [isInView, hasLoaded, loadFn]);

  // Ref callback for the observed element
  const setRef = useCallback((node: HTMLElement | null) => {
    ref.current = node;
  }, []);

  // Manual reload
  const reload = useCallback(async () => {
    setHasLoaded(false);
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await loadFn();
      setData(result);
      setHasLoaded(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, [loadFn]);

  return {
    ref: setRef,
    data,
    isLoading,
    error,
    isInView,
    hasLoaded,
    reload,
  };
};

// Hook for lazy loading list items with virtualization support
export const useLazyLoadList = <T>(
  items: T[],
  visibleCount: number = 10
) => {
  const [visibleItems, setVisibleItems] = useState<T[]>([]);
  const [startIndex, setStartIndex] = useState(0);
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const endIndex = Math.min(startIndex + visibleCount, items.length);
    setVisibleItems(items.slice(startIndex, endIndex));
  }, [items, startIndex, visibleCount]);

  const loadMore = useCallback(() => {
    setStartIndex(prev => Math.min(prev + visibleCount, items.length - visibleCount));
  }, [items.length, visibleCount]);

  const loadPrevious = useCallback(() => {
    setStartIndex(prev => Math.max(prev - visibleCount, 0));
  }, [visibleCount]);

  const scrollTo = useCallback((index: number) => {
    setStartIndex(Math.max(0, index - Math.floor(visibleCount / 2)));
  }, [visibleCount]);

  const hasMore = startIndex + visibleCount < items.length;
  const hasPrevious = startIndex > 0;

  return {
    containerRef,
    visibleItems,
    startIndex,
    loadMore,
    loadPrevious,
    scrollTo,
    hasMore,
    hasPrevious,
    totalCount: items.length,
  };
};

export default useLazyLoad;

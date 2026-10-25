import { useEffect, useRef, useState } from 'react';

/**
 * Returns true once the element has entered the viewport.
 * Re-triggers only once by default (triggerOnce = true).
 */
export function useInView(options = {}, triggerOnce = true) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (triggerOnce) observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px', ...options }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, inView];
}

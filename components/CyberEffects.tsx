import { useEffect } from 'react';

export default function CyberEffects() {
  useEffect(() => {
    // Cursor trail effect
    const handleMouseMove = (e: MouseEvent) => {
      // Create subtle trail elements
      const trailElement = document.createElement('div');
      trailElement.className = 'cursor-trail';
      trailElement.style.left = e.clientX - 2 + 'px';
      trailElement.style.top = e.clientY - 2 + 'px';
      document.body.appendChild(trailElement);

      // Remove trail element after animation
      setTimeout(() => {
        if (document.body.contains(trailElement)) {
          document.body.removeChild(trailElement);
        }
      }, 1200);
    };

    // Scroll-triggered fade-in animations
    const observeElements = () => {
      const elements = document.querySelectorAll('.fade-in-section');
      
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
            }
          });
        },
        {
          threshold: 0.1,
          rootMargin: '0px 0px -50px 0px'
        }
      );

      elements.forEach((element) => {
        observer.observe(element);
      });

      return observer;
    };

    // Initialize effects
    document.addEventListener('mousemove', handleMouseMove);
    const observer = observeElements();

    // Cleanup
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      observer.disconnect();
    };
  }, []);

  return null;
}

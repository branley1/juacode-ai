// frontend/src/components/MobileDetector.js
import { useEffect } from 'react';

const MobileDetector = ({ children }) => {
  useEffect(() => {
    const handleResize = () => {
      document.body.classList.toggle('is-mobile', window.innerWidth < 768);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return children;
};

export default MobileDetector;
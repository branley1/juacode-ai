import React, { useEffect, useState } from 'react';
import styles from './AvatarPlaceholder.module.css';

interface AvatarPlaceholderProps {
  username?: string | null;
}

const AvatarPlaceholder: React.FC<AvatarPlaceholderProps> = ({ username }) => {
  const [color, setColor] = useState<string>('#888');

  useEffect(() => {
    if (username) {
      let hash = 0;
      for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
      }
      const h = Math.abs(hash) % 360;
      setColor(`hsl(${h}, 60%, 70%)`);
    } else {
      setColor('#888');
    }
  }, [username]);

  const initials = username
    ? username
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '';

  return (
    <div
      className={styles.avatarPlaceholder}
      style={{ backgroundColor: color }}
    >
      {initials || <span className={styles.avatarIcon}>👤</span>}
    </div>
  );
};

export default AvatarPlaceholder; 
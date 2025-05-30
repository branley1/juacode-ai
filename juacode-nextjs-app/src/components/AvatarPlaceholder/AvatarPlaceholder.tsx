import React, { useEffect, useState } from 'react';
import styles from './AvatarPlaceholder.module.css';

interface AvatarPlaceholderProps {
  username?: string | null;
  size?: number;
}

const AvatarPlaceholder: React.FC<AvatarPlaceholderProps> = ({ username, size }) => {
  const defaultSize = 150;
  const computedSize = size ?? defaultSize;
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

  // Inline styles to allow custom sizing and override margin when size prop used
  const style: React.CSSProperties = {
    backgroundColor: color,
    width: `${computedSize}px`,
    height: `${computedSize}px`,
    fontSize: `${computedSize * 0.6}px`,
  };
  if (size !== undefined) {
    style.marginBottom = '0';
  }
  return (
    <div
      className={styles.avatarPlaceholder}
      style={style}
    >
      {initials || (
        <span
          className={styles.avatarIcon}
          style={{ fontSize: `${computedSize * 0.4}px` }}
        >👤</span>
      )}
    </div>
  );
};

export default AvatarPlaceholder; 
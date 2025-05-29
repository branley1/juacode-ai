'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import styles from './error.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSyncAlt } from '@fortawesome/free-solid-svg-icons';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void; }) {
  useEffect(() => {
    console.error("Global Next.js Error Boundary Caught:", error);
  }, [error]);

  return (
        <div className={styles.errorFallback}>
          <h3>Something went wrong!</h3>
          <p>We&apos;ve encountered an issue. Error details:</p>
          <pre className={styles.errorDetails}>{error.message || 'No error message provided.'}</pre>
          <p>Digest: {error.digest}</p>
          <button
            onClick={
              // Attempt to recover by trying to re-render the segment
              () => reset()
            }
          >
            <FontAwesomeIcon icon={faSyncAlt} />
            Try again
          </button>
        </div>
  );
} 
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';
import juaCodeLogo from './jua-code-logo.png';

export default function NotFound() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <Image
            src={juaCodeLogo}
            alt="JuaCode Logo"
            width={80}
            height={80}
            priority
          />
          <h1 className={styles.title}>404 - Page Not Found</h1>
        </header>

        <p className={styles.description}>
          Oops! The page you are looking for does not exist or has been moved.
        </p>

        <div className={styles.ctaContainer}>
          <Link href="/" passHref>
            <button className={styles.ctaButton}>
              Go to Homepage
            </button>
          </Link>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} JuaCode. All rights reserved.</p>
      </footer>
    </div>
  );
} 
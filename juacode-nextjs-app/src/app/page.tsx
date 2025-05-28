import Image from "next/image";
import styles from "./page.module.css";
import juaCodeLogo from "./jua-code-logo.png";

export default function Home() {
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
          <h1 className={styles.title}>JuaCode AI</h1>
        </header>

        <p className={styles.description}>
          Your intelligent coding assistant. Let&apos;s build something amazing together.
        </p>

        <div className={styles.ctaContainer}>
          <button 
            className={styles.ctaButton}
          >
            Start Chatting
          </button>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} JuaCode. All rights reserved.</p>
      </footer>
    </div>
  );
}

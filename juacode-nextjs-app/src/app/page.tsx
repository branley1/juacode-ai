'use client';

import Image from "next/image";
import { useRouter } from 'next/navigation';
import styles from "./page.module.css";
import juaCodeLogo from "./jua-code-logo.png";

export default function StartPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const handleStartChatting = () => {
    const isLoggedIn = !!localStorage.getItem('authToken');

    if (isLoggedIn) {
      alert("Redirecting to main chat app (feature to be fully implemented)");
    } else {
      alert("Redirecting to login/register page (feature to be fully implemented)");
    }
  };

  return (
    <div className={styles.pageContainer}>
      <main className={styles.mainContent}>
        <Image
          src={juaCodeLogo}
          alt="JuaCode AI Logo"
          width={100}
          height={100}
          priority
          className={styles.logo}
        />
        <h1 className={styles.title}>JuaCode AI</h1>
        <p className={styles.description}>
          Your intelligent coding assistant. Let's build something amazing together.
        </p>
        <button className={styles.ctaButton} onClick={handleStartChatting}>
          Start Chatting
        </button>
      </main>
      <footer className={styles.footer}>
        <p>&copy; {currentYear} JuaCode. All rights reserved.</p>
      </footer>
    </div>
  );
}

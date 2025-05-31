// src/app/page.tsx
"use client";
export const dynamic = 'force-static';

import Image from 'next/image'
import dynamicImport from 'next/dynamic'
import './landing.css'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useRouter } from 'next/navigation'

// only load LandingMenu on the client, and only when it's needed
const LandingMenu = dynamicImport(() => import('@/components/LandingPage/LandingPage'), {
  ssr: false,
  loading: () => <div className="spinner" />
})

export default function LandingPage() {
  const { isUserAuthenticated } = useAuth()
  const { isDarkMode, toggleTheme } = useTheme()
  const router = useRouter()
  const handleStartChatting = () => router.push('/chat')
  const handleNavigateToProfile = () => router.push('/profile')
  return (
    <div className="landing-page-container">
      {/* purely static content */}
      <header className="landing-header">
        <Image
          src="/assets/jua-code-logo.png"
          alt="JuaCode Logo"
          width={80}
          height={80}
          priority
          placeholder="blur"
        />
        <h1>JuaCode AI</h1>
      </header>
      <p className="landing-description-text">
        Your intelligent coding assistant. Let's build something amazing together.
      </p>
      {/* interactive menu only loads on client */}
      <LandingMenu
        onStartChatting={handleStartChatting}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        onNavigateToProfile={handleNavigateToProfile}
        isUserAuthenticated={isUserAuthenticated}
      />
    </div>
  )
}

import { useEffect, useState } from 'react';
import { IntroSection } from './sections/IntroSection';
import { HeroSection } from './sections/HeroSection';
import { ProjectsSection } from './sections/ProjectsSection';
import { AboutSection } from './sections/AboutSection';

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [showMain, setShowMain] = useState(false);
  const [isVideoHovering, setIsVideoHovering] = useState(false);

  useEffect(() => {
    const hideIntroTimer = window.setTimeout(() => setShowIntro(false), 8000);
    const showMainTimer = window.setTimeout(() => setShowMain(true), 8800);

    return () => {
      window.clearTimeout(hideIntroTimer);
      window.clearTimeout(showMainTimer);
    };
  }, []);

  return (
    <div className="app-shell">
      <IntroSection visible={showIntro} />

      <main className={`main-content ${showMain ? 'main-visible' : 'main-hidden'}`}>
        <HeroSection isVideoHovering={isVideoHovering} isMainVisible={showMain} />
        <ProjectsSection onVideoHoverChange={setIsVideoHovering} />
        <AboutSection />
      </main>
    </div>
  );
}

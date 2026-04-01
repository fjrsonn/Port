import { useEffect, useState } from 'react';
import { IntroSection } from './sections/IntroSection';
import { HeroSection } from './sections/HeroSection';
import { ProjectsSection } from './sections/ProjectsSection';
import { AboutSection } from './sections/AboutSection';

export default function App() {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowIntro(false), 8000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="app-shell">
      <IntroSection visible={showIntro} />

      {!showIntro && (
        <main>
          <HeroSection />
          <ProjectsSection />
          <AboutSection />
        </main>
      )}
    </div>
  );
}

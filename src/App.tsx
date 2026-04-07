import { useEffect, useState } from 'react';
import { IntroSection } from './sections/IntroSection';
import { HeroSection } from './sections/HeroSection';
import { ProjectsSliderSection } from './sections/ProjectsSliderSection';
import { AboutSection } from './sections/AboutSection';

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [showMain, setShowMain] = useState(false);

  // Mantidos para compatibilidade com a HeroSection nova
  const [isVideoHovering] = useState(false);
  const [isProjectCardVisible] = useState(false);

  useEffect(() => {
    const introTextTimelineMs = 2900;

    const hideIntroTimer = window.setTimeout(() => {
      setShowIntro(false);
    }, introTextTimelineMs);

    const showMainTimer = window.setTimeout(() => {
      setShowMain(true);
    }, introTextTimelineMs);

    return () => {
      window.clearTimeout(hideIntroTimer);
      window.clearTimeout(showMainTimer);
    };
  }, []);

  return (
    <>
      {showIntro && <IntroSection visible={showIntro} />}

      <main className={`main-content ${showMain ? 'main-visible' : 'main-hidden'}`}>
        <HeroSection
          isVideoHovering={isVideoHovering}
          isMainVisible={showMain}
          isProjectCardVisible={isProjectCardVisible}
        />

        <ProjectsSliderSection isMainVisible={showMain} />

        <AboutSection />
      </main>
    </>
  );
}
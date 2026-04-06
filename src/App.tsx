import { useEffect, useState } from 'react';
import { IntroSection } from './sections/IntroSection';
import { HeroSection } from './sections/HeroSection';
import { ProjectsSection } from './sections/ProjectsSection';
import { AboutSection } from './sections/AboutSection';
import { SliderGallerySection } from './sections/SliderGallerySection';

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [showMain, setShowMain] = useState(false);
  const [isVideoHovering, setIsVideoHovering] = useState(false);
  const [isProjectCardVisible, setIsProjectCardVisible] = useState(false);

  useEffect(() => {
    const introTextTimelineMs = 2900;
    const hideIntroAt = introTextTimelineMs;
    const showMainAt = hideIntroAt;

    const hideIntroTimer = window.setTimeout(() => setShowIntro(false), hideIntroAt);
    const showMainTimer = window.setTimeout(() => setShowMain(true), showMainAt);

    return () => {
      window.clearTimeout(hideIntroTimer);
      window.clearTimeout(showMainTimer);
    };
  }, []);

  return (
    <div className="app-shell">
      <IntroSection visible={showIntro} />

      <main className={`main-content ${showMain ? 'main-visible' : 'main-hidden'}`}>
        <HeroSection
          isVideoHovering={isVideoHovering}
          isMainVisible={showMain}
          isProjectCardVisible={isProjectCardVisible}
        />
        <ProjectsSection
          onVideoHoverChange={setIsVideoHovering}
          onCardInViewChange={setIsProjectCardVisible}
        />
        <AboutSection />
        <SliderGallerySection />
      </main>
    </div>
  );
}

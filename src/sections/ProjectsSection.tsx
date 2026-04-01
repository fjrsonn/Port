import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type ProjectItem = {
  id: string;
  title: string;
  videoUrl: string;
};

const projects: ProjectItem[] = [
  { id: 'video-1', title: 'Projeto 01', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' },
  { id: 'video-2', title: 'Projeto 02', videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' },
  { id: 'video-3', title: 'Projeto 03', videoUrl: 'https://www.w3schools.com/html/movie.mp4' },
];

export function ProjectsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showNavigator, setShowNavigator] = useState(false);

  const panelWidth = useMemo(() => `${projects.length * 100}vw`, []);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      const cards = cardRefs.current.filter(Boolean);
      gsap.set(cards, { opacity: 0, xPercent: 120, rotateY: -35, transformOrigin: 'right center' });

      cards.forEach((card, index) => {
        gsap.to(card, {
          opacity: 1,
          xPercent: 0,
          rotateY: 0,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'left center',
            end: 'right center',
            scrub: true,
            horizontal: true,
            containerAnimation: ScrollTrigger.getById('projects-horizontal'),
            onEnter: () => setActiveIndex(index),
            onEnterBack: () => setActiveIndex(index),
          },
        });
      });

      const horizontalTween = gsap.to('.project-track', {
        xPercent: -100 * (projects.length - 1),
        ease: 'none',
        scrollTrigger: {
          id: 'projects-horizontal',
          trigger: sectionRef.current,
          pin: true,
          scrub: 1,
          start: 'top top',
          end: `+=${window.innerWidth * projects.length}`,
        },
      });

      videoRefs.current.forEach((video, idx) => {
        if (!video) return;

        ScrollTrigger.create({
          trigger: cardRefs.current[idx],
          containerAnimation: horizontalTween.scrollTrigger,
          start: 'left center',
          end: 'right center',
          onEnter: () => {
            video.currentTime = 0;
            void video.play();
          },
          onEnterBack: () => {
            video.currentTime = 0;
            void video.play();
          },
          onLeave: () => video.pause(),
          onLeaveBack: () => video.pause(),
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="projetos"
      className="projects-section"
      ref={sectionRef}
      onMouseEnter={() => setShowNavigator(true)}
      onMouseLeave={() => setShowNavigator(false)}
    >
      <div className="projects-header">
        <h2>Projetos</h2>
      </div>

      <div className="project-track" style={{ width: panelWidth }}>
        {projects.map((project, index) => (
          <div
            key={project.id}
            ref={(el) => {
              cardRefs.current[index] = el;
            }}
            className="project-card"
            aria-label={project.title}
          >
            <video
              ref={(el) => {
                videoRefs.current[index] = el;
              }}
              className="project-video"
              src={project.videoUrl}
              muted
              loop
              playsInline
              preload="auto"
            />
            <p className="project-title">{project.title}</p>
          </div>
        ))}
      </div>

      <nav className={`project-nav ${showNavigator ? 'visible' : ''}`}>
        {projects.map((project, index) => (
          <button
            key={project.id}
            type="button"
            className={`nav-square ${activeIndex === index ? 'active' : ''}`}
            onClick={() => {
              const trigger = ScrollTrigger.getById('projects-horizontal');
              if (!trigger) return;
              const progress = index / (projects.length - 1);
              const y = trigger.start + (trigger.end - trigger.start) * progress;
              window.scrollTo({ top: y, behavior: 'smooth' });
            }}
            aria-label={`Ir para ${project.title}`}
          />
        ))}
      </nav>
    </section>
  );
}

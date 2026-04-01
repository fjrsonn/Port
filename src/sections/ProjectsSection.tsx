import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type ProjectItem = {
  id: string;
  title: string;
  videoUrl: string;
};

type ProjectsSectionProps = {
  onVideoHoverChange?: (isHoveringVideo: boolean) => void;
};

const projects: ProjectItem[] = [
  { id: 'video-1', title: 'Projeto 01', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' },
  { id: 'video-2', title: 'Projeto 02', videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' },
  { id: 'video-3', title: 'Projeto 03', videoUrl: 'https://www.w3schools.com/html/movie.mp4' },
];

export function ProjectsSection({ onVideoHoverChange }: ProjectsSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showNavigator, setShowNavigator] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [hoveredVideoIndex, setHoveredVideoIndex] = useState<number | null>(null);

  const panelWidth = useMemo(() => `${projects.length * 100}vw`, []);

  useEffect(() => {
    if (!sectionRef.current || !trackRef.current) return;

    const ctx = gsap.context(() => {
      const cards = cardRefs.current.filter((card): card is HTMLDivElement => Boolean(card));

      const horizontalTween = gsap.to(trackRef.current, {
        xPercent: -100 * (projects.length - 1),
        ease: 'none',
        scrollTrigger: {
          id: 'projects-horizontal',
          trigger: sectionRef.current,
          pin: true,
          scrub: 1,
          start: 'top top',
          end: `+=${window.innerWidth * (projects.length - 1)}`,
        },
      });

      gsap.set(cards, { opacity: 0, xPercent: 110, rotateY: -26, transformOrigin: 'right center' });

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
            containerAnimation: horizontalTween,
            onEnter: () => setActiveIndex(index),
            onEnterBack: () => setActiveIndex(index),
          },
        });
      });

      videoRefs.current.forEach((video, idx) => {
        if (!video) return;

        ScrollTrigger.create({
          trigger: cardRefs.current[idx],
          containerAnimation: horizontalTween,
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

  useEffect(() => {
    const onFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement as HTMLElement | null;

      if (!fullscreenElement) {
        setFullscreenIndex(null);
        onVideoHoverChange?.(false);
        videoRefs.current.forEach((video) => {
          if (!video) return;
          video.controls = false;
          video.muted = true;
        });
        return;
      }

      const foundIndex = videoRefs.current.findIndex((video) => video === fullscreenElement);
      if (foundIndex >= 0) {
        setFullscreenIndex(foundIndex);
        onVideoHoverChange?.(true);
        const video = videoRefs.current[foundIndex];
        if (video) {
          video.controls = true;
          video.muted = false;
        }
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [onVideoHoverChange]);

  return (
    <section
      id="projetos"
      className="projects-section"
      ref={sectionRef}
      onMouseEnter={() => setShowNavigator(true)}
      onMouseLeave={() => {
        setShowNavigator(false);
        if (fullscreenIndex === null) onVideoHoverChange?.(false);
      }}
    >
      <div ref={trackRef} className="project-track" style={{ width: panelWidth }}>
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
              className={`project-video ${hoveredVideoIndex === index ? 'is-hovered' : ''}`}
              src={project.videoUrl}
              muted={fullscreenIndex !== index}
              loop
              playsInline
              controls={fullscreenIndex === index}
              preload="auto"
              onMouseEnter={() => {
                setHoveredVideoIndex(index);
                onVideoHoverChange?.(true);
                const card = cardRefs.current[index];
                if (card) {
                  gsap.to(card, { opacity: 1, duration: 0.2, overwrite: 'auto' });
                }
              }}
              onMouseLeave={() => {
                setHoveredVideoIndex(null);
                if (fullscreenIndex === null) onVideoHoverChange?.(false);
              }}
              onClick={async (event) => {
                const video = event.currentTarget;
                if (document.fullscreenElement === video) {
                  await document.exitFullscreen();
                  return;
                }

                if (video.requestFullscreen) {
                  await video.requestFullscreen();
                }
              }}
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
              const targetY = trigger.start + index * window.innerWidth;
              const clampedY = Math.min(trigger.end, Math.max(trigger.start, targetY));
              window.scrollTo({ top: clampedY, behavior: 'smooth' });
            }}
            aria-label={`Ir para ${project.title}`}
          />
        ))}
      </nav>
    </section>
  );
}

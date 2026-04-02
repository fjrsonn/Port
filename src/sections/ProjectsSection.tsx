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
  const focusedVideoIndex = activeIndex;

  const panelWidth = useMemo(() => `${projects.length * 100}vw`, []);

  useEffect(() => {
    if (!sectionRef.current || !trackRef.current) return;


    const ctx = gsap.context(() => {
      const horizontalTween = gsap.to(trackRef.current, {
        xPercent: -100 * (projects.length - 1),
        ease: 'none',
        scrollTrigger: {
          id: 'projects-horizontal',
          trigger: sectionRef.current,
          pin: true,
          scrub: 1,
          snap: projects.length > 1 ? 1 / (projects.length - 1) : undefined,
          start: 'top top',
          end: `+=${window.innerWidth * (projects.length - 1)}`,
        },
      });

      cardRefs.current.forEach((card, index) => {
        if (!card) return;

        ScrollTrigger.create({
          trigger: card,
          start: 'left center',
          end: 'right center',
          containerAnimation: horizontalTween,
          onEnter: () => setActiveIndex(index),
          onEnterBack: () => setActiveIndex(index),
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
            videoRefs.current.forEach((otherVideo, otherIndex) => {
              if (!otherVideo || otherIndex === idx) return;
              otherVideo.pause();
            });
            video.currentTime = 0;
            void video.play();
          },
          onEnterBack: () => {
            videoRefs.current.forEach((otherVideo, otherIndex) => {
              if (!otherVideo || otherIndex === idx) return;
              otherVideo.pause();
            });
            video.currentTime = 0;
            void video.play();
          },
          onLeave: () => video.pause(),
          onLeaveBack: () => video.pause(),
        });
      });

      const initialVideo = videoRefs.current[0];
      if (initialVideo) {
        initialVideo.currentTime = 0;
        void initialVideo.play();
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="projetos"
      className="projects-section"
      ref={sectionRef}
      onMouseEnter={() => setShowNavigator(true)}
      onMouseLeave={() => {
        setShowNavigator(false);
        onVideoHoverChange?.(false);
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
              className="project-video"
              src={project.videoUrl}
              muted
              loop
              playsInline
              controls={false}
              preload="auto"
              onMouseEnter={() => onVideoHoverChange?.(true)}
              onMouseLeave={() => onVideoHoverChange?.(false)}
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
            className={`nav-square ${focusedVideoIndex === index ? 'active' : ''}`}
            onClick={() => {
              const trigger = ScrollTrigger.getById('projects-horizontal');
              if (!trigger) return;

              setFocusedVideoIndex(index);
              trigger.refresh();

              const maxSteps = Math.max(1, projects.length - 1);
              const stepSize = (trigger.end - trigger.start) / maxSteps;
              const targetY = trigger.start + stepSize * index;

              window.scrollTo(0, targetY);
            }}
            aria-label={`Ir para ${project.title}`}
          />
        ))}
      </nav>

      {focusedVideoIndex !== null && (
        <div
          className="project-video-focus"
          role="dialog"
          aria-modal="false"
          aria-label={`Prévia centralizada de ${projects[focusedVideoIndex].title}`}
          onClick={() => setFocusedVideoIndex(null)}
        >
          <video
            className="project-video-focus-player"
            src={projects[focusedVideoIndex].videoUrl}
            autoPlay
            muted
            loop
            playsInline
            controls
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}

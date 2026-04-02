import React, { useEffect, useMemo, useRef } from 'react';
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
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [hoveredVideoIndex, setHoveredVideoIndex] = React.useState<number | null>(null);
  const [fullscreenVideoIndex, setFullscreenVideoIndex] = React.useState<number | null>(null);

  const panelWidth = useMemo(() => `${projects.length * 100}vw`, []);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement;
      const currentIndex = videoRefs.current.findIndex((video) => video === fullscreenElement);
      setFullscreenVideoIndex(currentIndex >= 0 ? currentIndex : null);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!sectionRef.current || !trackRef.current) return;

    const ctx = gsap.context(() => {
      const horizontalTween = gsap.to(trackRef.current, {
        xPercent: -100 * (projects.length - 1),
        y: 0,
        ease: 'none',
        scrollTrigger: {
          id: 'projects-horizontal',
          trigger: sectionRef.current,
          pin: true,
          scrub: true,
          start: 'top top',
          end: `+=${window.innerWidth * (projects.length - 1)}`,
        },
      });

      const animateVideoOpacity = (currentIndex: number) => {
        videoRefs.current.forEach((video, idx) => {
          if (!video) return;
          const targetOpacity = idx === currentIndex ? 0.7 : 0.14;
          gsap.to(video, { opacity: targetOpacity, duration: 0.35, ease: 'power1.out', overwrite: 'auto' });
        });
      };

      const activateVideo = (idx: number) => {
        setActiveIndex(idx);
        videoRefs.current.forEach((otherVideo, otherIndex) => {
          if (!otherVideo || otherIndex === idx) return;
          otherVideo.pause();
        });

        const currentVideo = videoRefs.current[idx];
        if (currentVideo) {
          currentVideo.currentTime = 0;
          void currentVideo.play();
        }

        animateVideoOpacity(idx);
      };

      animateVideoOpacity(0);

      cardRefs.current.forEach((card, index) => {
        if (!card) return;

        ScrollTrigger.create({
          trigger: card,
          start: 'left center',
          end: 'right center',
          containerAnimation: horizontalTween,
          onEnter: () => activateVideo(index),
          onEnterBack: () => activateVideo(index),
        });
      });

      // garante estado inicial consistente do primeiro vídeo sem deslocamento vertical
      activateVideo(0);
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="projetos" className="projects-section" ref={sectionRef}>
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
              className={`project-video ${activeIndex === index ? 'is-active' : ''} ${hoveredVideoIndex === index ? 'is-hovered' : ''}`}
              src={project.videoUrl}
              muted={fullscreenVideoIndex !== index}
              loop
              playsInline
              controls={fullscreenVideoIndex === index}
              preload="auto"
              onMouseEnter={(event) => {
                setHoveredVideoIndex(index);
                onVideoHoverChange?.(true);
                gsap.to(event.currentTarget, { opacity: 1, duration: 0.2, overwrite: 'auto' });
              }}
              onMouseLeave={(event) => {
                setHoveredVideoIndex(null);
                onVideoHoverChange?.(false);
                const targetOpacity = activeIndexRef.current === index ? 0.7 : 0.14;
                gsap.to(event.currentTarget, { opacity: targetOpacity, duration: 0.2, overwrite: 'auto' });
              }}
              onClick={async (event) => {
                const video = event.currentTarget;
                if (document.fullscreenElement === video) return;
                await video.requestFullscreen();
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

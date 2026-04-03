import React, { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type ProjectItem = {
  id: string;
  title: string;
  videoUrls: string[];
};

type ProjectsSectionProps = {
  onVideoUnderTitleProgressChange?: (progress: number) => void;
  onVideoHoverChange?: (isHoveringVideo: boolean) => void;
};

const projects: ProjectItem[] = [
  {
    id: 'video-1',
    title: 'Projeto 01',
    videoUrls: [
      'https://www.w3schools.com/html/mov_bbb.mp4',
      'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    ],
  },
  {
    id: 'video-2',
    title: 'Projeto 02',
    videoUrls: [
      'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      'https://www.w3schools.com/html/movie.mp4',
    ],
  },
  {
    id: 'video-3',
    title: 'Projeto 03',
    videoUrls: [
      'https://www.w3schools.com/html/movie.mp4',
      'https://www.w3schools.com/html/mov_bbb.mp4',
    ],
  },
];

export function ProjectsSection({ onVideoUnderTitleProgressChange, onVideoHoverChange }: ProjectsSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [hoveredVideoIndex, setHoveredVideoIndex] = React.useState<number | null>(null);
  const [fullscreenVideoIndex, setFullscreenVideoIndex] = React.useState<number | null>(null);
  const [videoSourceIndexes, setVideoSourceIndexes] = React.useState<number[]>(() => projects.map(() => 0));

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
      const updateTitleOverlapProgress = () => {
        const heroTitle = document.querySelector('.hero-title:not(.hero-title-overlay)');
        if (!(heroTitle instanceof HTMLElement)) {
          onVideoUnderTitleProgressChange?.(0);
          return;
        }

        const titleRect = heroTitle.getBoundingClientRect();
        const titleArea = titleRect.width * titleRect.height;
        if (titleArea <= 0) {
          onVideoUnderTitleProgressChange?.(0);
          return;
        }

        let maxRatio = 0;
        videoRefs.current.forEach((video) => {
          if (!video) return;
          const videoRect = video.getBoundingClientRect();
          const overlapWidth = Math.max(0, Math.min(titleRect.right, videoRect.right) - Math.max(titleRect.left, videoRect.left));
          const overlapHeight = Math.max(0, Math.min(titleRect.bottom, videoRect.bottom) - Math.max(titleRect.top, videoRect.top));
          const overlapArea = overlapWidth * overlapHeight;
          const ratio = overlapArea / titleArea;
          if (ratio > maxRatio) {
            maxRatio = ratio;
          }
        });

        onVideoUnderTitleProgressChange?.(Math.max(0, Math.min(1, maxRatio)));
      };

      const horizontalTween = gsap.to(trackRef.current, {
        x: () => -(trackRef.current!.scrollWidth - window.innerWidth),
        ease: 'none',
        scrollTrigger: {
          id: 'projects-horizontal',
          trigger: sectionRef.current,
          pin: true,
          anticipatePin: 1,
          scrub: true,
          invalidateOnRefresh: true,
          start: 'top top',
          end: () => `+=${trackRef.current!.scrollWidth - window.innerWidth}`,
          onUpdate: () => {
            updateTitleOverlapProgress();
          },
          onRefresh: updateTitleOverlapProgress,
          onLeave: () => onVideoUnderTitleProgressChange?.(0),
          onLeaveBack: () => onVideoUnderTitleProgressChange?.(0),
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
        const video = videoRefs.current[index];

        ScrollTrigger.create({
          trigger: card,
          start: 'left center',
          end: 'right center',
          containerAnimation: horizontalTween,
          onEnter: () => activateVideo(index),
          onEnterBack: () => activateVideo(index),
        });

        if (video) {
          gsap.fromTo(
            video,
            { yPercent: 38 },
            {
              yPercent: 0,
              ease: 'none',
              scrollTrigger: {
                trigger: card,
                containerAnimation: horizontalTween,
                start: 'left 85%',
                end: 'left center',
                scrub: true,
                onUpdate: updateTitleOverlapProgress,
              },
            },
          );
        }
      });

      activateVideo(0);
      updateTitleOverlapProgress();

      const ticker = () => updateTitleOverlapProgress();
      gsap.ticker.add(ticker);
      ScrollTrigger.addEventListener('refresh', updateTitleOverlapProgress);

      return () => {
        gsap.ticker.remove(ticker);
        ScrollTrigger.removeEventListener('refresh', updateTitleOverlapProgress);
      };
    }, sectionRef);

    return () => {
      onVideoHoverChange?.(false);
      onVideoUnderTitleProgressChange?.(0);
      ctx.revert();
    };
  }, [onVideoHoverChange, onVideoUnderTitleProgressChange]);

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
              src={project.videoUrls[videoSourceIndexes[index]]}
              muted={fullscreenVideoIndex !== index}
              loop
              playsInline
              controls={fullscreenVideoIndex === index}
              preload="auto"
              onPointerEnter={(event) => {
                setHoveredVideoIndex(index);
                onVideoHoverChange?.(true);
                gsap.to(event.currentTarget, { opacity: 1, duration: 0.2, overwrite: 'auto' });
              }}
              onPointerLeave={(event) => {
                setHoveredVideoIndex(null);
                onVideoHoverChange?.(false);
                const targetOpacity = activeIndexRef.current === index ? 0.7 : 0.14;
                gsap.to(event.currentTarget, { opacity: targetOpacity, duration: 0.2, overwrite: 'auto' });
              }}
              onClick={(event) => {
                const video = event.currentTarget;
                if (document.fullscreenElement === video) return;
                void video.requestFullscreen();
              }}
              onError={() => {
                setVideoSourceIndexes((prev) => {
                  const next = [...prev];
                  const currentSource = next[index] ?? 0;
                  if (currentSource < project.videoUrls.length - 1) {
                    next[index] = currentSource + 1;
                  }
                  return next;
                });
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

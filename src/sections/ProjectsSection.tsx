import { useEffect, useMemo, useRef } from 'react';
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
          scrub: true,
          start: 'top top',
          end: `+=${window.innerWidth * (projects.length - 1)}`,
        },
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

    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="projetos"
      className="projects-section"
      ref={sectionRef}
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

    </section>
  );
}

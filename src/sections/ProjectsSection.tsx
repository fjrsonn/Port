import React, { useEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

type ProjectItem = {
  id: string
  title: string
  videoUrls: string[]
}

type ProjectsSectionProps = {
  onVideoHoverChange?: (isHoveringVideo: boolean) => void
  onCardInViewChange?: (isCardInView: boolean) => void
}

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
]

export function ProjectsSection({ onVideoHoverChange, onCardInViewChange }: ProjectsSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const activeIndexRef = useRef(0)
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [hoveredVideoIndex, setHoveredVideoIndex] = React.useState<number | null>(null)
  const [fullscreenVideoIndex, setFullscreenVideoIndex] = React.useState<number | null>(null)
  const [videoSourceIndexes, setVideoSourceIndexes] = React.useState<number[]>(() => projects.map(() => 0))

  const panelWidth = useMemo(() => `${projects.length * 100}vw`, [])

  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  useEffect(() => {
    const onFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement
      const currentIndex = videoRefs.current.findIndex((video) => video === fullscreenElement)
      setFullscreenVideoIndex(currentIndex >= 0 ? currentIndex : null)
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [])

  useEffect(() => {
    const sectionEl = sectionRef.current
    const trackEl = trackRef.current
    if (!sectionEl || !trackEl) return

    ScrollTrigger.getById('projects-horizontal')?.kill()
    ScrollTrigger.getById('projects-visibility')?.kill()
    cardRefs.current.forEach((_, index) => {
      ScrollTrigger.getById(`projects-card-${index}`)?.kill()
    })

    const ctx = gsap.context(() => {
      const getTrackDistance = () => Math.max(0, trackEl.scrollWidth - window.innerWidth)

      const horizontalTween = gsap.to(trackEl, {
        x: () => -getTrackDistance(),
        ease: 'none',
        scrollTrigger: {
          id: 'projects-horizontal',
          trigger: sectionEl,
          pin: true,
          anticipatePin: 1,
          scrub: true,
          invalidateOnRefresh: true,
          start: 'top top',
          end: () => `+=${getTrackDistance()}`,
        },
      })

      ScrollTrigger.create({
        id: 'projects-visibility',
        trigger: sectionEl,
        start: 'top bottom',
        end: 'bottom top',
        onEnter: () => onCardInViewChange?.(true),
        onEnterBack: () => onCardInViewChange?.(true),
        onLeave: () => onCardInViewChange?.(false),
        onLeaveBack: () => onCardInViewChange?.(false),
      })

      const animateVideoOpacity = (currentIndex: number) => {
        videoRefs.current.forEach((video, idx) => {
          if (!video) return
          const targetOpacity = idx === currentIndex ? 0.7 : 0.14
          gsap.to(video, { opacity: targetOpacity, duration: 0.35, ease: 'power1.out', overwrite: 'auto' })
        })
      }

      const activateVideo = (idx: number) => {
        setActiveIndex(idx)
        videoRefs.current.forEach((otherVideo, otherIndex) => {
          if (!otherVideo || otherIndex === idx) return
          otherVideo.pause()
        })

        const currentVideo = videoRefs.current[idx]
        if (currentVideo) {
          currentVideo.currentTime = 0
          void currentVideo.play()
        }

        animateVideoOpacity(idx)
      }

      animateVideoOpacity(0)

      cardRefs.current.forEach((card, index) => {
        if (!card) return

        ScrollTrigger.create({
          id: `projects-card-${index}`,
          trigger: card,
          start: 'left center',
          end: 'right center',
          containerAnimation: horizontalTween,
          onEnter: () => activateVideo(index),
          onEnterBack: () => activateVideo(index),
        })
      })

      activateVideo(0)
    }, sectionEl)

    return () => {
      onVideoHoverChange?.(false)
      onCardInViewChange?.(false)
      ctx.revert()
    }
  }, [onCardInViewChange, onVideoHoverChange])

  return (
    <section id="projetos" className="projects-section" ref={sectionRef}>
      <div ref={trackRef} className="project-track" style={{ width: panelWidth }}>
        {projects.map((project, index) => (
          <div
            key={project.id}
            ref={(el) => {
              cardRefs.current[index] = el
            }}
            className="project-card"
            aria-label={project.title}
          >
            <video
              ref={(el) => {
                videoRefs.current[index] = el
              }}
              className={`project-video ${activeIndex === index ? 'is-active' : ''} ${
                hoveredVideoIndex === index ? 'is-hovered' : ''
              }`}
              src={project.videoUrls[videoSourceIndexes[index]]}
              muted={fullscreenVideoIndex !== index}
              loop
              playsInline
              controls={fullscreenVideoIndex === index}
              preload="auto"
              onPointerEnter={(event) => {
                setHoveredVideoIndex(index)
                onVideoHoverChange?.(true)
                gsap.to(event.currentTarget, { opacity: 1, duration: 0.2, overwrite: 'auto' })
              }}
              onPointerLeave={(event) => {
                setHoveredVideoIndex(null)
                onVideoHoverChange?.(false)
                const targetOpacity = activeIndexRef.current === index ? 0.7 : 0.14
                gsap.to(event.currentTarget, { opacity: targetOpacity, duration: 0.2, overwrite: 'auto' })
              }}
              onClick={(event) => {
                const video = event.currentTarget
                if (document.fullscreenElement === video) return
                void video.requestFullscreen()
              }}
              onError={() => {
                setVideoSourceIndexes((prev) => {
                  const next = [...prev]
                  const currentSource = next[index] ?? 0
                  if (currentSource < project.videoUrls.length - 1) {
                    next[index] = currentSource + 1
                  }
                  return next
                })
              }}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

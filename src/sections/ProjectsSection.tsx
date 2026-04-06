import { useEffect } from 'react'

type ProjectsSectionProps = {
  onVideoHoverChange?: (isHoveringVideo: boolean) => void
  onCardInViewChange?: (isCardInView: boolean) => void
}

type Slide = {
  left?: string
  img: string
  title: string
}

const slides: Slide[] = [
  { img: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg', title: 'Projeto 01' },
  { left: '120%', img: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex2.jpg', title: 'Projeto 02' },
  { left: '240%', img: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg', title: 'Projeto 03' },
  { left: '360%', img: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex2.jpg', title: 'Projeto 04' },
  { left: '480%', img: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg', title: 'Projeto 05' },
  { left: '600%', img: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex2.jpg', title: 'Projeto 06' },
  { left: '720%', img: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg', title: 'Projeto 07' },
  { left: '840%', img: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex2.jpg', title: 'Projeto 08' },
]

export function ProjectsSection({
  onVideoHoverChange,
  onCardInViewChange,
}: ProjectsSectionProps) {
  useEffect(() => {
    onCardInViewChange?.(true)
    onVideoHoverChange?.(false)

    return () => {
      onCardInViewChange?.(false)
      onVideoHoverChange?.(false)
    }
  }, [onCardInViewChange, onVideoHoverChange])

  return (
    <section id="projetos" className="projects-section projects-webgl-section">
      <div className="slider js-drag-area">
        <div className="slider__inner js-slider">
          {slides.map((slide, i) => (
            <div
              key={i}
              className="slide js-slide"
              style={slide.left ? { left: slide.left } : undefined}
            >
              <div className="slide__inner js-slide__inner">
                <img className="js-slide__img" src={slide.img} alt={slide.title} draggable={false} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="titles">
        <div className="titles__title titles__title--proxy">{slides[0].title}</div>

        <div className="titles__list js-titles">
          {slides.map((slide, i) => (
            <div key={i} className="titles__title js-title">
              {slide.title}
            </div>
          ))}
          <div className="titles__title js-title">{slides[0].title}</div>
        </div>
      </div>

      <div className="progress">
        <div className="progress__line js-progress-line"></div>
        <div className="progress__line js-progress-line-2"></div>
      </div>
    </section>
  )
}

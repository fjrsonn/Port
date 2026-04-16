import { HeroSection, type HeroSectionProps } from './HeroSection';

type SkillsOneSectionProps = Omit<HeroSectionProps, 'sampleIndex' | 'sectionId'>;

export function SkillsOneSection(props: SkillsOneSectionProps) {
  return <HeroSection {...props} renderProfileGuideParticle={false} renderSearchUi={false} sectionId="skills-one" sampleIndex={2} />;
}

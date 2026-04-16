import { HeroSection, type HeroSectionProps } from './HeroSection';

type SkillsTwoSectionProps = Omit<HeroSectionProps, 'sampleIndex' | 'sectionId'>;

export function SkillsTwoSection(props: SkillsTwoSectionProps) {
  return <HeroSection {...props} renderProfileGuideParticle={false} renderSearchUi={false} sectionId="skills-two" sampleIndex={4} />;
}

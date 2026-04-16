import { HeroSection, type HeroSectionProps } from './HeroSection';

type ProfileOneSectionProps = Omit<HeroSectionProps, 'sampleIndex' | 'sectionId'>;

export function ProfileOneSection(props: ProfileOneSectionProps) {
  return <HeroSection {...props} renderProfileGuideParticle={false} renderSearchUi={false} sectionId="profile-one" sampleIndex={1} />;
}

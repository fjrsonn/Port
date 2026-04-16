import { HeroSection, type HeroSectionProps } from './HeroSection';

type ProfileTwoSectionProps = Omit<HeroSectionProps, 'sampleIndex' | 'sectionId'>;

export function ProfileTwoSection(props: ProfileTwoSectionProps) {
  return <HeroSection {...props} renderProfileGuideParticle={false} renderSearchUi={false} sectionId="profile-two" sampleIndex={3} />;
}

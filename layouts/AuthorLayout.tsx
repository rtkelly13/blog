import type { ReactNode } from 'react';
import type { AuthorFrontMatter } from 'types/AuthorFrontMatter';
import BracketText from '@/components/BracketText';
import Image from '@/components/Image';
import { PageSEO } from '@/components/SEO';
import SocialIcon from '@/components/social-icons';

interface Props {
  children: ReactNode;
  frontMatter: AuthorFrontMatter;
}

export default function AuthorLayout({ children, frontMatter }: Props) {
  const {
    name,
    avatar,
    occupation,
    company,
    email,
    twitter,
    linkedin,
    github,
  } = frontMatter;

  return (
    <>
      <PageSEO title={`About - ${name}`} description={`About me - ${name}`} />
      <div className="divide-y divide-zinc-800 font-mono">
        <div className="pt-6 pb-8 space-y-2 md:space-y-5">
          <h1 className="text-3xl font-display font-bold leading-tight tracking-widest text-white uppercase sm:text-4xl md:text-6xl drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] pb-4 inline-block relative">
            <BracketText>ABOUT_ME</BracketText>
            <div className="absolute bottom-0 left-0 w-full h-[4px] bg-brutalist-pink shadow-glow-pink" />
          </h1>
        </div>
        <div className="items-start space-y-2 xl:grid xl:grid-cols-3 xl:gap-x-8 xl:space-y-0 mt-8 pt-8">
          <div className="flex flex-col items-center pt-8 bg-black/80 border-2 border-brutalist-pink shadow-glow-pink p-6 rounded-md">
            <Image
              src={avatar}
              alt="avatar"
              width="192"
              height="192"
              className="w-48 h-48 border-2 border-white object-cover"
            />
            <h3 className="pt-4 pb-2 text-2xl font-bold leading-8 tracking-tight uppercase text-white mt-4">
              {name}
            </h3>
            <div className="text-brutalist-cyberOrange mb-1">
              {'>'} {occupation}
            </div>
            <div className="text-zinc-400">{company}</div>
            <div className="flex pt-6 space-x-3">
              <SocialIcon kind="mail" href={`mailto:${email}`} />
              <SocialIcon kind="github" href={github} />
              <SocialIcon kind="linkedin" href={linkedin} />
              <SocialIcon kind="twitter" href={twitter} />
            </div>
          </div>
          <div className="pt-8 pb-8 prose prose-invert max-w-none xl:col-span-2 text-zinc-300">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

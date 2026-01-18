import type { ReactNode } from 'react';
import type { AuthorFrontMatter } from 'types/AuthorFrontMatter';
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
      <div className="divide-y divide-white">
        <div className="pt-6 pb-8 space-y-2 md:space-y-5">
          <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-white sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 font-mono uppercase border-2 border-white inline-block px-4 py-2">
            [ ABOUT ]
          </h1>
        </div>
        <div className="items-start space-y-2 xl:grid xl:grid-cols-3 xl:gap-x-8 xl:space-y-0">
          <div className="flex flex-col items-center pt-8 space-x-2">
            <Image
              src={avatar}
              alt="avatar"
              width="192"
              height="192"
              className="w-48 h-48 border-2 border-white object-cover"
            />
            <h3 className="pt-4 pb-2 text-2xl font-bold leading-8 tracking-tight font-mono uppercase">
              {name}
            </h3>
            <div className="text-zinc-400 font-mono">{occupation}</div>
            <div className="text-zinc-400 font-mono">{company}</div>
            <div className="flex pt-6 space-x-3">
              <SocialIcon kind="mail" href={`mailto:${email}`} />
              <SocialIcon kind="github" href={github} />
              <SocialIcon kind="linkedin" href={linkedin} />
              <SocialIcon kind="twitter" href={twitter} />
            </div>
          </div>
          <div className="pt-8 pb-8 prose prose-invert max-w-none xl:col-span-2 font-mono">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

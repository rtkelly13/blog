import {
  GithubIcon,
  LinkedinIcon,
  MailIcon,
  TwitterIcon,
  XIcon,
} from './icons';

const components = {
  mail: MailIcon,
  github: GithubIcon,
  linkedin: LinkedinIcon,
  twitter: TwitterIcon,
  x: XIcon,
};

const SocialIcon = ({ kind, href, size = 8, className = '' }) => {
  if (!href) return null;

  const SocialSvg = components[kind as keyof typeof components];

  if (!SocialSvg) return null;

  return (
    <a
      className={`text-sm transition-colors ${className}`}
      target="_blank"
      rel="noopener noreferrer"
      href={href}
    >
      <span className="sr-only">{kind}</span>
      <SocialSvg
        className={`fill-current text-brutalist-cyan hover:text-brutalist-pink drop-shadow-[0_0_5px_rgba(34,211,238,0.5)] hover:drop-shadow-[0_0_8px_rgba(236,72,153,0.8)] transition-all h-${size} w-${size}`}
      />
    </a>
  );
};

export default SocialIcon;

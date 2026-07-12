import SocialIcon from '@/components/social-icons';
import siteMetadata from '@/data/siteMetadata';
import Link from './Link';

export default function Footer() {
  return (
    <footer className="relative z-10 bg-black/80 backdrop-blur border-t border-gray-800">
      <div className="flex flex-col items-center mt-8 mb-8">
        <div className="flex mb-4 space-x-6">
          <SocialIcon
            kind="mail"
            href={`mailto:${siteMetadata.email}`}
            size={8}
          />
          <SocialIcon kind="github" href={siteMetadata.github} size={8} />
          <SocialIcon kind="linkedin" href={siteMetadata.linkedin} size={8} />
          <SocialIcon
            kind="twitter"
            href={siteMetadata.x || siteMetadata.twitter}
            size={8}
          />
        </div>
        {/* The header nav is at capacity (it already overflows its 1024px
            container with seven links), so secondary destinations live here. */}
        <div className="flex mb-4 space-x-4 text-sm font-mono font-bold uppercase">
          <Link
            href="/projects"
            className="text-white hover:text-brutalist-cyan transition-colors"
          >
            [ Projects ]
          </Link>
        </div>
        <div className="flex space-x-2 text-sm font-mono text-white">
          <div>{siteMetadata.author}</div>
          <div>{` • `}</div>
          <div>{`© ${new Date().getFullYear()}`}</div>
          <div>{` • `}</div>
          <Link
            href="/"
            className="hover:text-brutalist-cyan transition-colors"
          >
            {siteMetadata.title}
          </Link>
        </div>
      </div>
    </footer>
  );
}

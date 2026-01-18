import Image from './Image';
import Link from './Link';

interface CardProps {
  title: string;
  description: string;
  imgSrc?: string;
  href?: string;
  asciiArt?: string;
  filename?: string;
}

const Card = ({
  title,
  description,
  imgSrc,
  href,
  asciiArt,
  filename,
}: CardProps) => (
  <div className="p-4 md:w-1/2" style={{ maxWidth: '544px' }}>
    <div className="h-full bg-zinc-900 border-2 border-white transition-all duration-200 hover:border-brutalist-cyan hover:shadow-hard-cyan group">
      <div className="border-b-2 border-white px-4 py-2 flex justify-between items-center bg-black">
        <span className="font-mono text-sm text-brutalist-yellow font-bold uppercase">
          {filename || `${title.toLowerCase().replace(/\s+/g, '_')}.md`}
        </span>
        {asciiArt && (
          <pre className="text-xs text-brutalist-cyan leading-none">
            {asciiArt}
          </pre>
        )}
      </div>

      {imgSrc && (
        <div className="border-b-2 border-white">
          {href ? (
            <Link href={href} aria-label={`Link to ${title}`}>
              <Image
                alt={title}
                src={imgSrc}
                className="object-cover object-center lg:h-48 md:h-36 w-full"
                width={544}
                height={306}
              />
            </Link>
          ) : (
            <Image
              alt={title}
              src={imgSrc}
              className="object-cover object-center lg:h-48 md:h-36 w-full"
              width={544}
              height={306}
            />
          )}
        </div>
      )}

      <div className="p-6">
        <h2 className="mb-3 text-2xl font-mono font-bold leading-8 tracking-tight uppercase text-white">
          {href ? (
            <Link
              href={href}
              aria-label={`Link to ${title}`}
              className="hover:text-brutalist-pink transition-colors"
            >
              [ {title} ]
            </Link>
          ) : (
            `[ ${title} ]`
          )}
        </h2>
        <p className="mb-4 font-mono text-gray-200 text-sm">{description}</p>
        {href && (
          <Link
            href={href}
            className="font-mono text-sm font-bold text-brutalist-cyan hover:text-brutalist-pink border-b-2 border-brutalist-cyan hover:border-brutalist-pink transition-colors"
            aria-label={`Link to ${title}`}
          >
            &gt; READ_MORE
          </Link>
        )}
      </div>
    </div>
  </div>
);

export default Card;

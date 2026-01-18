import Link from 'next/link';
import kebabCase from '@/lib/utils/kebabCase';

interface Props {
  text: string;
}

const Tag = ({ text }: Props) => {
  return (
    <Link
      href={`/tags/${kebabCase(text)}`}
      className="font-mono text-xs font-bold uppercase text-black bg-brutalist-yellow border-2 border-white px-2 py-1 hover:bg-brutalist-pink hover:shadow-hard-sm transition-all"
    >
      #{text.split(' ').join('-')}
    </Link>
  );
};

export default Tag;

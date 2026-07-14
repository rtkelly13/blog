import Button from '@/components/Button';
import Link from '@/components/Link';

export default function FourZeroFour() {
  return (
    <div className="flex flex-col items-start justify-start md:mt-24 md:flex-row md:items-center md:justify-center md:space-x-6">
      <div className="space-x-2 pt-6 pb-8 md:space-y-5">
        <h1 className="font-display text-6xl font-bold uppercase leading-9 tracking-tight text-white md:border-r-2 md:border-white md:px-6 md:text-8xl md:leading-14">
          404
        </h1>
      </div>
      <div className="max-w-md">
        <p className="mb-4 font-display text-xl font-bold uppercase leading-normal text-white md:text-2xl">
          [ PAGE_NOT_FOUND ]
        </p>
        <p className="mb-8 font-mono text-zinc-400">
          <span className="text-brutalist-yellow">&gt;</span> Don't worry —
          plenty of other things live on the homepage.
        </p>
        <Link href="/">
          <Button variant="cyan">Back to homepage</Button>
        </Link>
      </div>
    </div>
  );
}

interface TLDRProps {
  text: string;
}

const TLDR = ({ text }: TLDRProps) => (
  <aside
    className="bg-black border-brutalist-cyan text-white border-l-4 border-t-2 border-r-2 border-b-2 px-3 py-2 mb-8 font-mono not-prose"
    aria-label="TL;DR summary"
  >
    <p className="font-bold uppercase text-brutalist-cyan">[ TL;DR ]</p>
    <p className="text-sm mt-1">{text}</p>
  </aside>
);

export default TLDR;

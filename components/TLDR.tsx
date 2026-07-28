import { TLDR as SystemTLDR } from '@rtkelly13/design-system';

interface TLDRProps {
  text: string;
}

const TLDR = ({ text }: TLDRProps) => <SystemTLDR>{text}</SystemTLDR>;

export default TLDR;

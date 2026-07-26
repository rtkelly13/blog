import { TLDR as SystemTLDR } from '@rtkelly/design-system';
import React from 'react';

interface TLDRProps {
  text: string;
}

const TLDR = ({ text }: TLDRProps) => <SystemTLDR>{text}</SystemTLDR>;

export default TLDR;

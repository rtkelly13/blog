import { QRCodeSVG } from 'qrcode.react';
import siteMetadata from '@/data/siteMetadata';

interface ActivityQRProps {
  /** Talk slug; the QR points at /talks/<slug>/activity. */
  slug: string;
  /** Optional call-to-action shown under the code. */
  label?: string;
}

/**
 * Renders a scannable QR code (and the plain URL) for a talk's audience
 * activity. Used inside a deck slide so the room can join from their phones.
 * Self-contained SVG — exports to PDF cleanly.
 */
export default function ActivityQR({ slug, label }: ActivityQRProps) {
  const base = siteMetadata.siteUrl.replace(/\/$/, '');
  const url = `${base}/talks/${slug}/activity`;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="border-4 border-white bg-white p-3 shadow-hard-cyan">
        <QRCodeSVG value={url} size={220} bgColor="#ffffff" fgColor="#000000" />
      </div>
      <p className="font-mono text-lg font-bold text-brutalist-yellow">
        {label ?? 'Scan to join'}
      </p>
      <p className="font-mono text-sm text-brutalist-cyan">{url}</p>
    </div>
  );
}

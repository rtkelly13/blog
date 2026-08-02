import { AudioLines } from 'lucide-react';
import dynamic from 'next/dynamic';
import PageHeader from '@/components/PageHeader';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

/**
 * Speaker-attribution bench for the NeanderBonk referee: the loudness-gate
 * and voice-profile approaches racing on the same audio, plus the
 * two-mic-consumers feasibility probe. Client-only (microphone, Web Audio),
 * so it loads through `next/dynamic` with `ssr: false` like its siblings.
 */
const VoiceLab = dynamic(
  () => import('@/components/experiments/neanderbonk/voice/VoiceLab'),
  { ssr: false },
);

export default function NeanderBonkVoicePage() {
  return (
    <>
      <PageSEO
        title={`NeanderBonk Voice Lab - ${siteMetadata.author}`}
        description="Can the NeanderBonk referee tell who is speaking? Loudness-gate and voice-profile speaker attribution, side by side on live audio."
      />
      <div className="divide-y divide-white border-2 border-white bg-black">
        <PageHeader
          title="NEANDERBONK VOICE"
          icon={AudioLines}
          accent="pink"
          subtitle="Who said that? Two speaker-attribution approaches, one microphone"
        />
        <VoiceLab />
      </div>
    </>
  );
}

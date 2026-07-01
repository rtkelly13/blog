import type { GetStaticProps } from 'next';

// The presenter controls now live on the memorable /admin hub. Keep this path
// working (muscle memory / old links) by redirecting.
export const getStaticProps: GetStaticProps = async () => ({
  redirect: { destination: '/admin', permanent: false },
});

export default function LiveManageRedirect() {
  return null;
}

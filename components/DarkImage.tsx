import type { ImageProps } from 'next/image';
import Image from './Image';

interface DarkImageProps extends ImageProps {
  darkSrc: string;
  lightSrc: string;
}

const DarkImage = ({ lightSrc, darkSrc, ...rest }: DarkImageProps) => {
  const isDarkMode = window.matchMedia?.(
    '(prefers-color-scheme: dark)',
  ).matches;
  const imageProps = rest as ImageProps;
  imageProps.src = isDarkMode ? darkSrc : lightSrc;
  return <Image {...imageProps} />;
};

export default DarkImage;

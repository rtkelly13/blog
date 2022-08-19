import { ImageProps } from 'next/image'
import React from 'react'
import Image from './Image'
interface DarkImageProps extends ImageProps {
  darkSrc: string
  lightSrc: string
}

const DarkImage = ({ lightSrc, darkSrc, ...rest }: DarkImageProps) => {
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  const imageProps = rest as ImageProps
  imageProps.src = isDarkMode ? darkSrc : lightSrc
  return <Image {...imageProps} />
}

export default DarkImage

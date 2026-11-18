import Image, { type ImageProps } from "next/image"

const DEFAULT_FALLBACK_SRC = "/placeholder.png"

interface ImageWithFallbackProps extends ImageProps {
  fallBackSrc?: string
}

export function ImageWithFallback({ fallBackSrc = DEFAULT_FALLBACK_SRC, ...props }: ImageWithFallbackProps) {
  if (!props.src) {
    return <Image {...props} src={fallBackSrc} alt="Fallback image" />
  }

  return <Image {...props} src={props.src} alt={props.alt} />
}

import Image from 'next/image';

// public/images/tofutr-logo.png — 1415×539
const LOGO_SRC = '/images/tofutr-logo.png';
const LOGO_RATIO = 1415 / 539;

interface BrandLogoProps {
  /** Görünen yükseklik (piksel); genişlik oranla hesaplanır */
  height?: number;
  className?: string;
  priority?: boolean;
}

/** tofutr.com logosu */
export function BrandLogo({ height = 40, className, priority }: BrandLogoProps) {
  const width = Math.round(LOGO_RATIO * height);
  return (
    <Image
      src={LOGO_SRC}
      alt="tofutr.com"
      width={width}
      height={height}
      className={className}
      priority={priority}
      sizes={`${width}px`}
    />
  );
}

// EventThumb.tsx
import Image from "next/image";

interface Props {
  src: string | null;
  alt: string;
  className?: string;
}

export default function EventThumb({ src, alt, className = "" }: Props) {
  return src ? (
    <img
      src={src}
      alt={alt}
      width={96}
      height={96}
      className={`${className} object-cover`}
    />
  ) : (
    <div className={`${className} bg-slate-300`} aria-hidden />
  );
}

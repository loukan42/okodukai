/** Logo Okodukai (peint), servi en WebP à la bonne largeur plutôt que le PNG source de 1,2 Mo. */
export function Logo({ className, sizes = "150px", alt = "Okodukai" }: { className?: string; sizes?: string; alt?: string }) {
  return (
    <img
      className={className}
      src="/assets/brand/logo-full-320.webp"
      srcSet="/assets/brand/logo-full-320.webp 320w, /assets/brand/logo-full-640.webp 640w, /assets/brand/logo-full-960.webp 960w"
      sizes={sizes}
      width={1774}
      height={887}
      alt={alt}
      decoding="async"
    />
  );
}

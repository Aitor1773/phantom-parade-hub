// Icono original del atributo, como en el juego: 幻 rojo, 影 azul, 夜 verde, 行 amarillo
// (imágenes de 40 px en public/img/elements). Sirve en React y en Astro sin hidratar.
export const ELEMENT_KANJI: Record<string, string> = { red: '幻', blue: '影', green: '夜', yellow: '行' };

export default function ElementIcon({ el, size = 16, className = '', title }: { el: string | null | undefined; size?: number; className?: string; title?: string }) {
  if (!el || !(el in ELEMENT_KANJI)) return null;
  return (
    <img
      src={`/img/elements/${el}.png`}
      alt={title ?? ELEMENT_KANJI[el]}
      title={title ?? ELEMENT_KANJI[el]}
      width={size}
      height={size}
      decoding="async"
      draggable={false}
      className={`inline-block shrink-0 select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

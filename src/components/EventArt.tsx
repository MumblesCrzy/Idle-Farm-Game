import { memo, type FC } from 'react';
import styles from './EventArt.module.css';

/** Artwork for a seasonal event item: an image file, or an emoji until one exists */
export interface EventArtSource {
  emoji: string;
  /** Path under public/, such as './Sugar Pie Pumpkin.png'. Leave out to show the emoji. */
  image?: string;
}

interface EventArtProps {
  art: EventArtSource;
  /** Width and height in pixels */
  size?: number;
  /** Text for screen readers. Leave empty when nearby text already names the item. */
  alt?: string;
  className?: string;
}

/** Shows an event item's image, or its emoji when no image has been drawn yet */
const EventArt: FC<EventArtProps> = memo(({ art, size = 32, alt = '', className }) => {
  const classes = className ? `${styles.art} ${className}` : styles.art;
  if (art.image) {
    return (
      <img
        src={art.image}
        alt={alt}
        aria-hidden={alt === '' ? true : undefined}
        width={size}
        height={size}
        className={`${classes} ${styles.image}`}
      />
    );
  }
  return (
    <span
      className={classes}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.8) }}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >
      {art.emoji}
    </span>
  );
});

EventArt.displayName = 'EventArt';

export default EventArt;

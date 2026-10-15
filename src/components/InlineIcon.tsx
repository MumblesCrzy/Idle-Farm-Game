import { memo, type FC } from 'react';
import styles from './InlineIcon.module.css';

interface InlineIconProps {
  src: string;
  /** Text for screen readers. Leave empty when nearby text already names the icon. */
  alt?: string;
  /** Width and height in pixels */
  size?: number;
  /** Space after the icon in pixels */
  gap?: number;
  title?: string;
  className?: string;
}

/** A small image aligned with the text around it */
const InlineIcon: FC<InlineIconProps> = memo(({ src, alt = '', size = 16, gap, title, className }) => (
  <img
    src={src}
    alt={alt}
    aria-hidden={alt === '' ? true : undefined}
    width={size}
    height={size}
    title={title}
    className={className ? `${styles.icon} ${className}` : styles.icon}
    style={gap ? { marginRight: gap } : undefined}
  />
));

InlineIcon.displayName = 'InlineIcon';

export default InlineIcon;

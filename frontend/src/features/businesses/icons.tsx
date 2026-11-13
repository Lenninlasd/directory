import type { ComponentType, ReactNode, SVGProps } from 'react';

// Inline SVG icons drawn for this project (spec 003 NFR-7). All are decorative and hidden from
// assistive technology; the text next to them carries the meaning (AC-4.4). Size and color come
// from className, for example "size-5 text-ink".

type IconProps = SVGProps<SVGSVGElement>;
export type IconComponent = ComponentType<IconProps>;

function StrokeIcon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

// Interface icons

export const SearchIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5 20 20" />
  </StrokeIcon>
);

export const CloseIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <path d="m6 6 12 12M18 6 6 18" />
  </StrokeIcon>
);

// After the website link in the detail dialog (directory spec, "Website link").
export const ExternalLinkIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
  </StrokeIcon>
);

// Marks the opening hours text box as an AI feature (business-editing spec, "AI indicator").
export const SparkleIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <path d="M10 4.5 11.6 9.4 16.5 11 11.6 12.6 10 17.5 8.4 12.6 3.5 11 8.4 9.4Z" />
    <path d="M18 3v4M16 5h4M18 15.5v3M16.5 17h3" />
  </StrokeIcon>
);

export const StoreIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <path d="M4.5 4h15L21 9H3z" />
    <path d="M4.5 9v11h15V9" />
    <path d="M9.5 20v-5.5h5V20" />
  </StrokeIcon>
);

export const DeliveryIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <circle cx="6" cy="17" r="2.5" />
    <circle cx="18" cy="17" r="2.5" />
    <path d="M8.5 17H14l2.5-7H19M14 17l-2-6H7.5M16.5 10l-1.5-4h-2" />
    <path d="M3 8h5v3H3z" />
  </StrokeIcon>
);

export const AllCategoriesIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
  </StrokeIcon>
);

// Category icons (spec 003 section 7)

export const BasketIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <path d="M4 10h16l-1.6 9.2a1 1 0 0 1-1 .8H6.6a1 1 0 0 1-1-.8z" />
    <path d="M8.5 10 12 4l3.5 6M10 14v3M14 14v3" />
  </StrokeIcon>
);

export const SparklesIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <path d="m10 3 1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6z" />
    <path d="m18 14 .9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9z" />
  </StrokeIcon>
);

export const CoffeeIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <path d="M5 9h11v4.5a5.5 5.5 0 0 1-11 0z" />
    <path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16" />
    <path d="M9 3.5c-.8 1 .8 2 0 3M12.5 3.5c-.8 1 .8 2 0 3M4 21h14" />
  </StrokeIcon>
);

export const UtensilsIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <path d="M7 3v6a2 2 0 0 0 4 0V3M9 3v18" />
    <path d="M17 21V3c-2.2 1.3-3 4-3 7.5V13h3" />
  </StrokeIcon>
);

export const DumbbellIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" />
  </StrokeIcon>
);

export const BookIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <path d="M12 6.5C10.5 5 8 4.5 4 4.5v14c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-14c-4 0-6.5.5-8 2z" />
    <path d="M12 6.5v14" />
  </StrokeIcon>
);

export const PillIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(45 12 12)" />
    <path d="m9.5 14.5 5-5" />
  </StrokeIcon>
);

export const WrenchIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <path d="M16.66 4.15A4.5 4.5 0 1 0 19.85 7.34L17.8 6.2z" />
    <path d="M12.3 11.7 4.5 19.5" />
  </StrokeIcon>
);

export const FlowerIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <circle cx="12" cy="4.6" r="2.1" />
    <circle cx="15.4" cy="8" r="2.1" />
    <circle cx="12" cy="11.4" r="2.1" />
    <circle cx="8.6" cy="8" r="2.1" />
    <path d="M12 13.5V21M12 18c-1.5-2.5-4-3-5.5-2.5.5 2 2.5 3 5.5 2.5z" />
  </StrokeIcon>
);

export const ShirtIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <path d="M8.5 3.5 3.5 6.5l2 4L8 9.3v11.2h8V9.3l2.5 1.2 2-4-5-3a3.5 3.5 0 0 1-7 0z" />
  </StrokeIcon>
);

export const PawIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <circle cx="6.5" cy="10" r="1.7" />
    <circle cx="9.5" cy="6" r="1.7" />
    <circle cx="14.5" cy="6" r="1.7" />
    <circle cx="17.5" cy="10" r="1.7" />
    <path d="M12 12c-3 0-5.5 3.5-5.5 5.5 0 1.6 1.4 2.5 3 2 1.2-.4 1.6-.6 2.5-.6s1.3.2 2.5.6c1.6.5 3-.4 3-2 0-2-2.5-5.5-5.5-5.5z" />
  </StrokeIcon>
);

export const CartIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <path d="M3 4h2.2l2.4 11h10.8l2.1-8H6.4" />
    <circle cx="9" cy="19.5" r="1.5" />
    <circle cx="17" cy="19.5" r="1.5" />
  </StrokeIcon>
);

export const BreadIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <path d="M4 15.5C4 10.5 7.5 7 12 7s8 3.5 8 8.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 15.5z" />
    <path d="m8.5 11 1.5 2M12 10l1.5 2M15.5 11l1.5 2" />
  </StrokeIcon>
);

export const CakeIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <path d="M5 20.5v-7A1.5 1.5 0 0 1 6.5 12h11a1.5 1.5 0 0 1 1.5 1.5v7M4 20.5h16" />
    <path d="M5 15.5c1.2.8 2.3.8 3.5 0s2.3-.8 3.5 0 2.3.8 3.5 0 2.3-.8 3.5 0M12 12V8.5" />
    <path d="M12 4c.9.9 1 1.8 0 2.6-1-.8-.9-1.7 0-2.6z" />
  </StrokeIcon>
);

export const PhoneIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
    <path d="M10.5 18.5h3" />
  </StrokeIcon>
);

export const TagIcon = (props: IconProps) => (
  <StrokeIcon {...props}>
    <path d="M3.5 11.1V3.5h7.6l9.4 9.4-7.6 7.6z" />
    <circle cx="8" cy="8" r="1.5" />
  </StrokeIcon>
);

// The official WhatsApp glyph (plan 003 D-10): path data copied unmodified from
// Digital_Glyph_White_RGB_2026.svg, in the WhatsApp Brand Resource Center logo pack
// (https://www.meta.com/brand/resources/whatsapp/whatsapp-brand/, downloaded 2026-11-10).
// The fill is the brand's own white, kept as the `whatsapp-glyph` token. Do not recolor or
// redraw it; WhatsApp's guidelines only allow the official files, unmodified.
export const WhatsAppGlyph = ({ className, ...props }: IconProps) => (
  <svg
    viewBox="0 0 720 720"
    aria-hidden="true"
    focusable="false"
    className={`fill-whatsapp-glyph ${className ?? ''}`}
    {...props}
  >
    <path d="M360,0C161.18,0,0,161.18,0,360c0,65.41,17.45,126.75,47.94,179.61L0,720l187.02-44.21c51.34,28.18,110.28,44.21,172.98,44.21,198.82,0,360-161.18,360-360S558.82,0,360,0ZM360,655.52c-60.17,0-116.13-17.98-162.82-48.87l-110.49,28.14,30.99-105.61c-33.53-47.93-53.2-106.26-53.2-169.19,0-163.21,132.31-295.52,295.52-295.52s295.52,132.31,295.52,295.52-132.31,295.52-295.52,295.52Z" />
    <path d="M444.35,407.52l87.1,41.06c4,1.88,6.56,5.94,6.2,10.34-.94,11.46-5.54,34.43-26.13,55.02-58.12,58.12-162.49-7.64-166.74-10.18-25.67-13.79-50.06-32.24-73.19-55.36s-41.58-47.52-55.37-73.19c-2.55-4.24-68.31-108.61-10.18-166.74,20.59-20.59,43.56-25.19,55.02-26.13,4.41-.36,8.46,2.2,10.34,6.2l41.07,87.1c1.94,4.12,1.09,9.02-2.13,12.24l-30.61,30.61c-6.62,6.62-8.56,16.93-4,25.11,11.17,20.03,26.19,39.32,43.59,57.07,17.75,17.4,37.04,32.43,57.07,43.59,8.18,4.56,18.48,2.62,25.11-4l30.61-30.61c3.22-3.22,8.12-4.08,12.24-2.13Z" />
  </svg>
);

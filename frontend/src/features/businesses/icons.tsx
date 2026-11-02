import type { ReactNode, SVGProps } from 'react';

// Inline SVG icons (spec 003 NFR-7), drawn after the playground reference. All are decorative:
// size and color come from `className`, and the text next to them carries the meaning (AC-4.4).

export type IconProps = SVGProps<SVGSVGElement>;

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

export function SearchIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </StrokeIcon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </StrokeIcon>
  );
}

export function StoreIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M4 10v10h16V10" />
      <path d="M3 10l2-6h14l2 6a3 3 0 01-6 0 3 3 0 01-6 0 3 3 0 01-6 0z" />
      <path d="M10 20v-5h4v5" />
    </StrokeIcon>
  );
}

export function DeliveryIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <circle cx="6" cy="17" r="2.5" />
      <circle cx="18" cy="17" r="2.5" />
      <path d="M8.5 17h7M15 6h2l2.5 8.5M13 10h-5l-2 4.5" />
      <path d="M4 10h4" />
    </StrokeIcon>
  );
}

export function AllCategoriesIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </StrokeIcon>
  );
}

// Category icons, one per supported category of spec 003 section 7, plus the fallback tag.

export function BasketIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M3 10h18l-2 10H5z" />
      <path d="M8 10l3-6M16 10l-3-6M9 14v3M15 14v3" />
    </StrokeIcon>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
      <path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z" />
    </StrokeIcon>
  );
}

export function CoffeeIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M4 9h12v5a5 5 0 01-5 5H9a5 5 0 01-5-5z" />
      <path d="M16 11h1.5a2.5 2.5 0 010 5H16" />
      <path d="M8 3v3M12 3v3" />
    </StrokeIcon>
  );
}

export function UtensilsIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M6 3v7a2 2 0 002 2v9M10 3v7a2 2 0 01-2 2M8 3v6" />
      <path d="M17 21V3c-2 1-3 4-3 8h3" />
    </StrokeIcon>
  );
}

export function DumbbellIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M7 6v12M17 6v12M4 9v6M20 9v6M7 12h10" />
    </StrokeIcon>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M4 5a2 2 0 012-2h13v15H6a2 2 0 00-2 2z" />
      <path d="M4 20a2 2 0 002 1h13v-3" />
    </StrokeIcon>
  );
}

export function PillIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)" />
      <path d="M9.5 9.5l5 5" />
    </StrokeIcon>
  );
}

export function WrenchIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M14.5 5.5a4 4 0 005 5L13 17a2.1 2.1 0 01-3-3l6.5-6.5a4 4 0 01-2-2z" />
      <path d="M10 14l-5.5 5.5" />
    </StrokeIcon>
  );
}

export function FlowerIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <circle cx="12" cy="8" r="2.5" />
      <path d="M12 5.5c0-3 3-3 3 0M14.5 8c3 0 3 3 0 3M12 10.5c0 1.5-3 2-3-.5M9.5 8c-3 0-3-3 0-2.5M12 10.5V21M12 17c-2.5 0-4-1.5-4-3.5 2 0 4 1.5 4 3.5zM12 15c2.5 0 4-1.5 4-3.5-2 0-4 1.5-4 3.5z" />
    </StrokeIcon>
  );
}

export function ShirtIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M9 3l-5 3 2 4 2-1v12h8V9l2 1 2-4-5-3a3 3 0 01-6 0z" />
    </StrokeIcon>
  );
}

export function PawIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <circle cx="7" cy="9" r="1.8" />
      <circle cx="11" cy="5.5" r="1.8" />
      <circle cx="15.5" cy="6.5" r="1.8" />
      <circle cx="18" cy="11" r="1.8" />
      <path d="M8.5 18.5c-1.5-1.5 0-5 3.5-5.5s5 3 3.8 5c-1 1.5-2.5.5-3.8.5s-2.5 1-3.5 0z" />
    </StrokeIcon>
  );
}

export function CartIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M3 4h2.5l2.2 10.5h10.6L20.5 7H7" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
    </StrokeIcon>
  );
}

export function BreadIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M6 20h12V11a4 4 0 001-7.5C17 2 14.5 2 12 2S7 2 5 3.5A4 4 0 006 11z" />
      <path d="M9 8v3M12 7v3M15 8v3" />
    </StrokeIcon>
  );
}

export function CakeIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M4 21V13a2 2 0 012-2h12a2 2 0 012 2v8z" />
      <path d="M4 16c1.5 1 2.5 1 4 0s2.5-1 4 0 2.5 1 4 0 2.5-1 4 0M12 11V7" />
      <path d="M12 3.5c.8.8 1 1.6 0 2.5-1-.9-.8-1.7 0-2.5z" />
      <path d="M3 21h18" />
    </StrokeIcon>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </StrokeIcon>
  );
}

export function TagIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M3 12V4h8l10 10-8 8z" />
      <circle cx="7.5" cy="8.5" r="1.5" />
    </StrokeIcon>
  );
}

// The official WhatsApp glyph, unmodified: Digital_Glyph_White_RGB_2026.svg from the WhatsApp Brand
// Resource Center (https://www.whatsappbrand.com/, downloaded 2026-11-02). The brand guidelines
// forbid changing its shape or colors, so the white fill is fixed and it always sits on the
// `whatsapp` color (plan 003 D-10).
export function WhatsAppGlyph(props: IconProps) {
  return (
    <svg viewBox="0 0 720 720" fill="#fff" aria-hidden="true" focusable="false" {...props}>
      <path d="M360,0C161.18,0,0,161.18,0,360c0,65.41,17.45,126.75,47.94,179.61L0,720l187.02-44.21c51.34,28.18,110.28,44.21,172.98,44.21,198.82,0,360-161.18,360-360S558.82,0,360,0ZM360,655.52c-60.17,0-116.13-17.98-162.82-48.87l-110.49,28.14,30.99-105.61c-33.53-47.93-53.2-106.26-53.2-169.19,0-163.21,132.31-295.52,295.52-295.52s295.52,132.31,295.52,295.52-132.31,295.52-295.52,295.52Z" />
      <path d="M444.35,407.52l87.1,41.06c4,1.88,6.56,5.94,6.2,10.34-.94,11.46-5.54,34.43-26.13,55.02-58.12,58.12-162.49-7.64-166.74-10.18-25.67-13.79-50.06-32.24-73.19-55.36s-41.58-47.52-55.37-73.19c-2.55-4.24-68.31-108.61-10.18-166.74,20.59-20.59,43.56-25.19,55.02-26.13,4.41-.36,8.46,2.2,10.34,6.2l41.07,87.1c1.94,4.12,1.09,9.02-2.13,12.24l-30.61,30.61c-6.62,6.62-8.56,16.93-4,25.11,11.17,20.03,26.19,39.32,43.59,57.07,17.75,17.4,37.04,32.43,57.07,43.59,8.18,4.56,18.48,2.62,25.11-4l30.61-30.61c3.22-3.22,8.12-4.08,12.24-2.13Z" />
    </svg>
  );
}

export function LocationIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M12 21s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </StrokeIcon>
  );
}

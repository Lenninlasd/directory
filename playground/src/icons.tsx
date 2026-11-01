import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

// 24x24 stroke icons; size and color come from className (e.g. "size-5 text-ink").
function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const MenuIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Icon>
);

export const CloseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </Icon>
);

export const PinIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 21s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z" />
    <circle cx="12" cy="9" r="2.5" />
  </Icon>
);

export const ChevronDownIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 9l6 6 6-6" />
  </Icon>
);

export const StoreIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 10v10h16V10" />
    <path d="M3 10l2-6h14l2 6a3 3 0 01-6 0 3 3 0 01-6 0 3 3 0 01-6 0z" />
    <path d="M10 20v-5h4v5" />
  </Icon>
);

export const ScooterIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="6" cy="17" r="2.5" />
    <circle cx="18" cy="17" r="2.5" />
    <path d="M8.5 17h7M15 6h2l2.5 8.5M13 10h-5l-2 4.5" />
    <path d="M4 10h4" />
  </Icon>
);

export const ChatIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 20l1.4-4A8 8 0 1112 20a8 8 0 01-3.6-.9z" />
    <path d="M9 10.5c.5 2 2 3.5 4.5 4.5l1-1.2-1.5-1-.8.6c-.8-.4-1.4-1-1.8-1.8l.6-.8-1-1.5z" />
  </Icon>
);

export const GridIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" />
  </Icon>
);

export const WrenchIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M14.5 5.5a4 4 0 005 5L13 17a2.1 2.1 0 01-3-3l6.5-6.5a4 4 0 01-2-2z" />
    <path d="M10 14l-5.5 5.5" />
  </Icon>
);

export const UtensilsIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 3v7a2 2 0 002 2v9M10 3v7a2 2 0 01-2 2M8 3v6" />
    <path d="M17 21V3c-2 1-3 4-3 8h3" />
  </Icon>
);

export const CoffeeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 9h12v5a5 5 0 01-5 5H9a5 5 0 01-5-5z" />
    <path d="M16 11h1.5a2.5 2.5 0 010 5H16" />
    <path d="M8 3v3M12 3v3" />
  </Icon>
);

export const SparklesIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
    <path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z" />
  </Icon>
);

export const BookIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 5a2 2 0 012-2h13v15H6a2 2 0 00-2 2z" />
    <path d="M4 20a2 2 0 002 1h13v-3" />
  </Icon>
);

export const BreadIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 20h12V11a4 4 0 001-7.5C17 2 14.5 2 12 2S7 2 5 3.5A4 4 0 006 11z" />
    <path d="M9 8v3M12 7v3M15 8v3" />
  </Icon>
);

export const BasketIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 10h18l-2 10H5z" />
    <path d="M8 10l3-6M16 10l-3-6M9 14v3M15 14v3" />
  </Icon>
);

export const TagIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 12V4h8l10 10-8 8z" />
    <circle cx="7.5" cy="8.5" r="1.5" />
  </Icon>
);

export const PillIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)" />
    <path d="M9.5 9.5l5 5" />
  </Icon>
);

export const PawIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="7" cy="9" r="1.8" />
    <circle cx="11" cy="5.5" r="1.8" />
    <circle cx="15.5" cy="6.5" r="1.8" />
    <circle cx="18" cy="11" r="1.8" />
    <path d="M8.5 18.5c-1.5-1.5 0-5 3.5-5.5s5 3 3.8 5c-1 1.5-2.5.5-3.8.5s-2.5 1-3.5 0z" />
  </Icon>
);

export const ShirtIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9 3l-5 3 2 4 2-1v12h8V9l2 1 2-4-5-3a3 3 0 01-6 0z" />
  </Icon>
);

export const CakeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 21V13a2 2 0 012-2h12a2 2 0 012 2v8z" />
    <path d="M4 16c1.5 1 2.5 1 4 0s2.5-1 4 0 2.5 1 4 0 2.5-1 4 0M12 11V7" />
    <path d="M12 3.5c.8.8 1 1.6 0 2.5-1-.9-.8-1.7 0-2.5z" />
    <path d="M3 21h18" />
  </Icon>
);

export const PhoneIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
    <path d="M11 18.5h2" />
  </Icon>
);

export const FlowerIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="8" r="2.5" />
    <path d="M12 5.5c0-3 3-3 3 0M14.5 8c3 0 3 3 0 3M12 10.5c0 1.5-3 2-3-.5M9.5 8c-3 0-3-3 0-2.5M12 10.5V21M12 17c-2.5 0-4-1.5-4-3.5 2 0 4 1.5 4 3.5zM12 15c2.5 0 4-1.5 4-3.5-2 0-4 1.5-4 3.5z" />
  </Icon>
);

export const DumbbellIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M7 6v12M17 6v12M4 9v6M20 9v6M7 12h10" />
  </Icon>
);

export const CartIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 4h2.5l2.2 10.5h10.6L20.5 7H7" />
    <circle cx="9" cy="19" r="1.5" />
    <circle cx="17" cy="19" r="1.5" />
  </Icon>
);

export const GlobeIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9S14.5 18.5 12 21c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3z" />
  </Icon>
);

export const ClockIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);

export const ExternalLinkIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />
  </Icon>
);

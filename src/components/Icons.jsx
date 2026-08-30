/**
 * Line icons lifted straight from the design canvas so stroke weights and
 * geometry stay identical to the artboards.
 */

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
};

export const HomeIcon = (props) => (
  <svg width={21} height={21} {...base} strokeLinejoin="round" {...props}>
    <path d="M4 10.5 12 4l8 6.5V20H4z" />
  </svg>
);

export const SearchIcon = (props) => (
  <svg width={21} height={21} {...base} {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="M16.5 16.5 21 21" />
  </svg>
);

export const BookIcon = (props) => (
  <svg width={21} height={21} {...base} strokeLinejoin="round" {...props}>
    <path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2z" />
    <path d="M9 4v14M15 6v14" />
  </svg>
);

export const PersonIcon = (props) => (
  <svg width={21} height={21} {...base} strokeLinecap="round" {...props}>
    <circle cx="12" cy="9" r="3.4" />
    <path d="M5.5 20c1.4-3.2 4-4.6 6.5-4.6S17.1 16.8 18.5 20" />
  </svg>
);

export const PlusIcon = (props) => (
  <svg width={20} height={20} {...base} strokeWidth={2} strokeLinecap="round" {...props}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const BackIcon = (props) => (
  <svg width={17} height={17} {...base} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M14 6l-6 6 6 6" />
  </svg>
);

export const CloseIcon = (props) => (
  <svg width={16} height={16} {...base} strokeLinecap="round" {...props}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const GripIcon = (props) => (
  <svg width={16} height={16} {...base} strokeLinecap="round" {...props}>
    <path d="M4 9h16M4 15h16" />
  </svg>
);

export const CheckIcon = (props) => (
  <svg width={11} height={11} {...base} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 12.5 9 17.5 20 6.5" />
  </svg>
);

export const PlayIcon = (props) => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M8 5v14l11-7z" />
  </svg>
);

export const LocateIcon = (props) => (
  <svg width={14} height={14} {...base} strokeLinecap="round" {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </svg>
);

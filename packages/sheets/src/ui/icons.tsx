/*!
 * Icons inlined so the package has no icon dependency. Paths are copied
 * unchanged from:
 *
 * Heroicons v2.2.0 — MIT License, Copyright (c) Tailwind Labs, Inc.
 * https://github.com/tailwindlabs/heroicons/blob/master/LICENSE
 *
 * Lucide v0.525.0 — ISC License. Copyright (c) for portions of Lucide are held
 * by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c)
 * for Lucide are held by Lucide Contributors 2022.
 * https://github.com/lucide-icons/lucide/blob/main/LICENSE
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 */
import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function heroSolid20(d: string) {
  return function HeroiconSolid20(props: IconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
        data-slot="icon"
        {...props}
      >
        <path fillRule="evenodd" d={d} clipRule="evenodd" />
      </svg>
    );
  };
}

function lucide(children: ReactNode) {
  return function LucideIcon(props: IconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={24}
        height={24}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
      >
        {children}
      </svg>
    );
  };
}

export const ArrowsUpDownIcon = heroSolid20(
  'M2.24 6.8a.75.75 0 0 0 1.06-.04l1.95-2.1v8.59a.75.75 0 0 0 1.5 0V4.66l1.95 2.1a.75.75 0 1 0 1.1-1.02l-3.25-3.5a.75.75 0 0 0-1.1 0L2.2 5.74a.75.75 0 0 0 .04 1.06Zm8 6.4a.75.75 0 0 0-.04 1.06l3.25 3.5a.75.75 0 0 0 1.1 0l3.25-3.5a.75.75 0 1 0-1.1-1.02l-1.95 2.1V6.75a.75.75 0 0 0-1.5 0v8.59l-1.95-2.1a.75.75 0 0 0-1.06-.04Z',
);
export const ChevronDownIcon = heroSolid20(
  'M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z',
);
export const ChevronUpIcon = heroSolid20(
  'M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z',
);
export const FunnelIcon = heroSolid20(
  'M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 8 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L2.659 6.22A2.25 2.25 0 0 1 2 4.629V2.34a.75.75 0 0 1 .628-.74Z',
);

/** Heroicons 24/outline, the only outline icon in use. */
export function PlusIcon(props: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
      data-slot="icon"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.5v15m7.5-7.5h-15"
      />
    </svg>
  );
}

export const Check = lucide(<path d="M20 6 9 17l-5-5" />);
export const LoaderCircle = lucide(<path d="M21 12a9 9 0 1 1-6.219-8.56" />);
export const TriangleAlert = lucide(
  <>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </>,
);
export const ArrowUpRight = lucide(
  <>
    <path d="M7 7h10v10" />
    <path d="M7 17 17 7" />
  </>,
);
export const PanelRight = lucide(
  <>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M15 3v18" />
  </>,
);

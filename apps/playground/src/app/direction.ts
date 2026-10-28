import { createContext } from 'react';

/** Whether the page is right-to-left; TanStack needs it to resize by drag. */
export const RtlContext = createContext(false);

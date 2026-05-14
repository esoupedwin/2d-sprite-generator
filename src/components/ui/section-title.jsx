import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

/** Small uppercase section heading used throughout the side panels. */
const SectionTitle = forwardRef(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn('text-[0.675rem] font-bold uppercase tracking-[0.08em] text-muted-foreground', className)}
    {...props}
  />
));
SectionTitle.displayName = 'SectionTitle';

export { SectionTitle };

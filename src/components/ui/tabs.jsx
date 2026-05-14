import { forwardRef } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const tabsListVariants = cva('flex items-center', {
  variants: {
    variant: {
      default: 'h-9 rounded-lg bg-muted p-1 text-muted-foreground',
      line: 'gap-0',
    },
  },
  defaultVariants: { variant: 'default' },
});

const tabsTriggerVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'rounded-md px-3 py-1 text-sm font-medium ring-offset-background focus-visible:ring-offset-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow',
        line:
          'px-3 py-1.5 text-xs font-medium border-b-2 border-transparent -mb-px text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground hover:text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

const Tabs = TabsPrimitive.Root;

const TabsList = forwardRef(({ className, variant = 'default', ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(tabsListVariants({ variant }), className)}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = forwardRef(({ className, variant = 'default', ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(tabsTriggerVariants({ variant }), className)}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };

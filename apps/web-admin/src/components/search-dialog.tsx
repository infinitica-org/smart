'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@smart/ui/button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@smart/ui/command';
import { sidebarItems } from '@/navigation/sidebar-items';

export function SearchDialog() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === 'j' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="secondary"
        className="hidden h-10 min-w-48 justify-start gap-2 rounded-full px-3 font-normal text-muted-foreground sm:inline-flex"
      >
        <Search className="size-4" strokeWidth={1.75} />
        Search
        <kbd className="ml-auto inline-flex h-5 items-center rounded-md bg-background/70 px-1.5 font-sans text-[10px] text-muted-foreground">
          ⌘J
        </kbd>
      </Button>
      <Button
        onClick={() => setOpen(true)}
        variant="secondary"
        size="icon"
        className="rounded-full sm:hidden"
        aria-label="Search"
      >
        <Search className="size-4" strokeWidth={1.75} />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder="Jump to a page…" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {sidebarItems.map((group, index) => (
              <React.Fragment key={group.id}>
                {index > 0 ? <CommandSeparator /> : null}
                <CommandGroup heading={group.label}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <CommandItem
                        key={item.id}
                        value={`${group.label} ${item.title}`}
                        onSelect={() => {
                          setOpen(false);
                          router.push(item.url);
                        }}
                      >
                        <Icon strokeWidth={1.75} />
                        <span>{item.title}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </React.Fragment>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

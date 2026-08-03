// Compatibility shim: emulates next/link + next/navigation on top of TanStack Router.
import * as React from "react";
import {
  Link as TSLink,
  useRouter as useTSRouter,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";

type LinkProps = React.ComponentProps<"a"> & {
  href: string;
  to?: string;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  children?: React.ReactNode;
};

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, to, prefetch, replace, scroll, children, ...rest },
  ref,
) {
  const target = (to ?? href) || "/";
  // External link → plain anchor
  if (/^https?:\/\//i.test(target) || target.startsWith("mailto:") || target.startsWith("tel:")) {
    return (
      <a ref={ref} href={target} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <TSLink
      ref={ref}
      to={target as string}
      replace={replace}
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </TSLink>
  );
});

export default Link;

export function usePathname(): string {
  return useRouterState({ select: (s) => s.location.pathname });
}

export function useSearchParams() {
  const search = useRouterState({ select: (s) => s.location.search }) as unknown;
  const rec: Record<string, string> = {};
  if (search && typeof search === "object") {
    for (const [k, v] of Object.entries(search as Record<string, unknown>)) {
      rec[k] = String(v);
    }
  }
  const params = new URLSearchParams(rec);
  return {
    get: (k: string) => params.get(k),
    has: (k: string) => params.has(k),
    toString: () => params.toString(),
  };
}

export function useRouter() {
  const nav = useNavigate();
  const r = useTSRouter();
  return {
    push: (href: string) => nav({ to: href }),
    replace: (href: string) => nav({ to: href, replace: true }),
    back: () => r.history.back(),
    forward: () => r.history.forward(),
    refresh: () => r.invalidate(),
    prefetch: (_href: string) => {},
  };
}

export function redirect(href: string): never {
  if (typeof window !== "undefined") window.location.href = href;
  throw new Error("REDIRECT:" + href);
}

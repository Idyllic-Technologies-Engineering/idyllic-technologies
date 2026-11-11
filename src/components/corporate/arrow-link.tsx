import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

type Variant = "accent" | "primary" | "secondary" | "light";

const variants: Record<Variant, { pill: string; circle: string }> = {
  accent: { pill: "bg-accent text-on-accent hover:bg-accent-hover", circle: "bg-on-accent text-accent" },
  primary: { pill: "bg-action text-on-action hover:bg-action-hover", circle: "bg-on-action text-action" },
  secondary: { pill: "border border-line-strong bg-surface text-ink hover:bg-sunken", circle: "bg-ink text-surface" },
  light: { pill: "bg-white/95 text-[#0b1426] hover:bg-white", circle: "bg-[#0b1426] text-white" },
};

type Props = { href: string; children: React.ReactNode; variant?: Variant; external?: boolean; className?: string };

/** A pill link with its arrow in a circle. The main call to action on the public site. */
export function ArrowLink({ href, children, variant = "primary", external = false, className = "" }: Props) {
  const v = variants[variant];
  const classes = `group inline-flex h-12 items-center gap-3 rounded-full py-1 pr-1 pl-6 text-base font-medium whitespace-nowrap transition-[background-color,transform] duration-150 ease-[var(--ease-out-strong)] active:scale-[0.97] ${v.pill} ${className}`;
  const inner = (
    <>
      {children}
      <span className={`flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-200 ease-[var(--ease-out-strong)] group-hover:rotate-45 ${v.circle}`}>
        <ArrowUpRight size={18} weight="bold" aria-hidden />
      </span>
    </>
  );
  return external ? (
    <a href={href} className={classes} data-cta="">
      {inner}
    </a>
  ) : (
    <Link href={href} className={classes} data-cta="">
      {inner}
    </Link>
  );
}

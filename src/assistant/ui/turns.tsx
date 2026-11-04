"use client";

import { ArrowRight, Info, Scales, UserCircle } from "@phosphor-icons/react";
import { assistantBookAction } from "@/assistant/actions";
import type { Answers, ComparisonTurnRow, Handoff, Question, QuestionOption, Suggestion, SuggestionGroup, Turn } from "@/assistant/engine/types";
import { SmartLink, contactHref, marketplaceHref, productHref, type Origins } from "@/assistant/ui/links";
import { MediaImage } from "@/components/corporate/media-image";
import { BookButton } from "@/components/marketplace/book-button";
import { Spinner } from "@/components/ui/spinner";
import { track } from "@/lib/analytics";

const pill = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line-strong bg-surface px-5 py-2 font-medium transition-[background-color,transform] duration-150 ease-[var(--ease-out-strong)] hover:bg-sunken active:scale-[0.97]";

export function AssistantLine({ children }: { children: React.ReactNode }) {
  return <div className="assistant-line flex max-w-[92%] flex-col gap-3 self-start rounded-card rounded-tl-input bg-sunken p-4">{children}</div>;
}

/** The first thing said, by the time of day. */
export function GreetingLine({ text }: { text: string }) {
  return (
    <AssistantLine>
      <p className="font-heading text-xl font-medium">{text}</p>
    </AssistantLine>
  );
}

export function UserLine({ text }: { text: string }) {
  return <p className="assistant-line max-w-[85%] self-end rounded-full bg-primary px-5 py-2.5 font-medium text-on-primary">{text}</p>;
}

function Notes({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2 rounded-input border border-line bg-surface p-3 text-sm text-ink-muted">
      {notes.map((note) => (
        <li key={note} className="flex gap-2">
          <Info size={18} className="mt-0.5 shrink-0" aria-hidden />
          <span>{note}</span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- question

export function QuestionTurn({ question, answered, disabled, onChoose }: { question: Question; /** Once answered, the options go and only the question stays. */ answered: boolean; disabled: boolean; onChoose: (q: Question, o: QuestionOption) => void }) {
  const headingId = `assistant-q-${question.id}`;
  return (
    <AssistantLine>
      {question.intro ? <p className="text-ink-muted">{question.intro}</p> : null}
      <h3 id={headingId} className="font-heading text-xl font-medium">{question.prompt}</h3>
      {question.hint ? <p className="-mt-2 text-sm text-ink-muted">{question.hint}</p> : null}
      {answered ? null : (
      <ul aria-labelledby={headingId} className="flex flex-col gap-2">
        {question.options.map((option, i) => (
          <li key={option.id} className="assistant-option" style={{ animationDelay: `${i * 40}ms` }}>
            <button type="button" disabled={disabled} onClick={() => onChoose(question, option)} className={`${pill} w-full justify-start text-left disabled:opacity-60`}>
              {option.label}
            </button>
          </li>
        ))}
      </ul>
      )}
    </AssistantLine>
  );
}

// ---------------------------------------------------------- recommendation

function SuggestionCard({ product, origins, onOpen }: { product: Suggestion; origins: Origins; onOpen: () => void }) {
  return (
    <li className="relative flex gap-4 rounded-card border border-line bg-surface p-3">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-input bg-sunken">
        {product.image ? <MediaImage image={product.image} fill sizes="80px" className="object-contain p-2" /> : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-sm text-ink-muted">{product.brandName}</p>
        <h4 className="font-medium break-words">
          <SmartLink href={productHref(origins, product.slug)} onNavigate={onOpen} onClick={() => track("assistant_handoff", { target: "product" })} className="after:absolute after:inset-0 after:content-[''] hover:underline hover:underline-offset-4">
            {product.name}
          </SmartLink>
        </h4>
        {product.reasons.length > 0 ? (
          <ul className="flex flex-col gap-1 text-sm text-ink-muted">
            {product.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

function Group({ group, origins, disabled, onCompare, onOpen }: { group: SuggestionGroup; origins: Origins; disabled: boolean; onCompare: (ids: string[]) => void; onOpen: () => void }) {
  return (
    <section className="flex flex-col gap-2">
      <h4 className="text-sm font-medium text-ink-muted">{group.categoryName}</h4>
      <ul className="flex flex-col gap-2">
        {group.products.map((p) => (
          <SuggestionCard key={p.id} product={p} origins={origins} onOpen={onOpen} />
        ))}
      </ul>
      {group.products.length >= 2 ? (
        <button type="button" disabled={disabled} onClick={() => onCompare(group.products.map((p) => p.id))} className={`${pill} self-start disabled:opacity-60`}>
          <Scales size={20} aria-hidden />
          Compare these {group.products.length}
        </button>
      ) : null}
    </section>
  );
}

export function RecommendationTurn(props: { turn: Extract<Turn, { kind: "recommendation" }>; origins: Origins; busy: boolean; onCompare: (ids: string[]) => void; onClose: () => void }) {
  const { turn, origins, busy, onCompare, onClose } = props;
  return (
    <AssistantLine>
      <h3 className="font-heading text-xl font-medium">{turn.headline}</h3>
      {turn.groups.map((g) => (
        <Group key={g.categorySlug} group={g} origins={origins} disabled={busy} onCompare={onCompare} onOpen={onClose} />
      ))}
      {/* After the products, so the answer comes first and the caveats follow. */}
      <Notes notes={turn.notes} />
      <Handoffs handoffs={turn.handoffs} answers={turn.state.answers} origins={origins} onClose={onClose} />
    </AssistantLine>
  );
}

// -------------------------------------------------------------- comparison

function Row({ row, names }: { row: ComparisonTurnRow; names: string[] }) {
  return (
    <div className="flex flex-col gap-1 border-t border-line pt-3 first:border-t-0 first:pt-0">
      <dt className="text-sm font-medium text-ink-muted">{row.label}</dt>
      <dd>
        {/* Two columns that both wrap, so a long value (a dimension string) never squeezes the product name
            to one letter a line or runs out of the card. Values share a left edge, so they read like a table. */}
        <ul className="flex flex-col gap-2">
          {row.values.map((value, i) => (
            <li key={names[i]} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-4">
              <span className="min-w-0 text-ink-muted [overflow-wrap:anywhere]">{names[i]}</span>
              <span className={`min-w-0 [overflow-wrap:anywhere] tabular-nums ${row.differs ? "font-medium" : ""}`}>{value}</span>
            </li>
          ))}
        </ul>
      </dd>
    </div>
  );
}

export function ComparisonTurn({ turn, origins, onClose }: { turn: Extract<Turn, { kind: "comparison" }>; origins: Origins; onClose: () => void }) {
  const names = turn.products.map((p) => p.name);
  return (
    <AssistantLine>
      <h3 className="font-heading text-xl font-medium">{turn.headline}</h3>
      {turn.rows.length > 0 ? (
        <dl className="flex flex-col gap-3 rounded-input border border-line bg-surface p-3">
          {turn.rows.map((row) => (
            <Row key={row.id} row={row} names={names} />
          ))}
        </dl>
      ) : null}
      <Notes notes={turn.notes} />
      <Handoffs handoffs={turn.handoffs} answers={turn.state.answers} origins={origins} onClose={onClose} />
    </AssistantLine>
  );
}

// ----------------------------------------------------------------- handoff

export function HandoffTurn({ turn, origins, onClose }: { turn: Extract<Turn, { kind: "handoff" }>; origins: Origins; onClose: () => void }) {
  return (
    <AssistantLine>
      <h3 className="font-heading text-xl font-medium">{turn.headline}</h3>
      <Notes notes={turn.notes} />
      <Handoffs handoffs={turn.handoffs} answers={turn.state.answers} origins={origins} onClose={onClose} />
    </AssistantLine>
  );
}

/** WhatsApp is the main action when it is offered. The other ways to continue sit beside it. */
function Handoffs({ handoffs, answers, origins, onClose }: { handoffs: Handoff[]; answers: Answers; origins: Origins; onClose: () => void }) {
  const whatsapp = handoffs.find((h) => h.target === "whatsapp");
  const others = handoffs.filter((h) => h.target !== "whatsapp");
  return (
    <div className="flex flex-col gap-2">
      {whatsapp && whatsapp.target === "whatsapp" ? (
        <BookButton
          ids={whatsapp.productIds}
          source="assistant"
          perform={() => assistantBookAction({ answers, productIds: whatsapp.productIds })}
          label={whatsapp.label}
          size="md"
          onBooked={() => track("assistant_handoff", { target: "whatsapp" })}
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        {others.map((h) =>
          h.target === "marketplace" ? (
            <SmartLink key={h.target} href={marketplaceHref(origins, h.path)} onNavigate={onClose} onClick={() => track("assistant_handoff", { target: "marketplace" })} className={pill}>
              {h.label}
              <ArrowRight size={18} aria-hidden />
            </SmartLink>
          ) : h.target === "contact" ? (
            <SmartLink key={h.target} href={contactHref(origins, answers)} onNavigate={onClose} onClick={() => track("assistant_handoff", { target: "contact" })} className={pill}>
              <UserCircle size={20} aria-hidden />
              {h.label}
            </SmartLink>
          ) : null,
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------- loading and error

export function PendingLine() {
  return (
    <AssistantLine>
      <p className="flex items-center gap-3 text-ink-muted">
        <Spinner />
        One moment
      </p>
    </AssistantLine>
  );
}

export function FailedLine({ onRetry }: { onRetry: () => void }) {
  return (
    <AssistantLine>
      <p>I could not get an answer just now.</p>
      <button type="button" onClick={onRetry} className={`${pill} self-start`}>
        Try again
      </button>
    </AssistantLine>
  );
}

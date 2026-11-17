import { Icon } from "@/components/ui/icon";

type Item = { id: string; question: string; answer: string };

/**
 * Figma 153:4349 (closed) / 153:4344 (open): 880 wide, gap 16 between items, 6 between question and answer;
 * both rows gray-50, r6, pad 12/16. Native <details>: works without JavaScript. The 6 is a margin on the answer:
 * a flex `gap` also applies to the hidden content slot of a closed <details> (item step 70 instead of 64).
 */
export function FaqList({ items }: { items: Item[] }) {
  return (
    <div className="flex w-full flex-col gap-4">
      {items.map((q, i) => (
        <details key={q.id} open={i === 0} className="group">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-[6px] bg-gray-50 px-4 py-3 text-body-md-flat text-brand-950 [&::-webkit-details-marker]:hidden">
            <span>{q.question}</span>
            <Icon name="caret-down-brand" size={20} className="shrink-0 group-open:hidden" />
            <Icon name="caret-up" size={20} className="hidden shrink-0 group-open:block" />
          </summary>
          <p className="mt-1.5 whitespace-pre-line rounded-[6px] bg-gray-50 px-4 py-3 text-body-sm-flat text-gray-700">{q.answer}</p>
        </details>
      ))}
    </div>
  );
}

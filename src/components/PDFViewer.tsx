"use client";
import { locateExcerpt, type HighlightRange } from "@/lib/pdf-highlight";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs, type PageProps } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import type { CiteTarget } from "./ChatWorkspace";

// react-pdf requires this in the module that renders <Document>.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

// One full download: range requests made after the 5-minute presigned URL expires would fail.
const DOCUMENT_OPTIONS = { disableRange: true };
// Pages within a viewport of the visible area get a canvas; the rest stay placeholders.
const RENDER_MARGIN = "100% 0px";

type Props = {
  fileKey: string;
  target: CiteTarget | null;
};

type Layout = { numPages: number; aspect: number };
type TextRenderer = NonNullable<PageProps["customTextRenderer"]>;

function PDFViewer({ fileKey, target }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef(new Map<number, HTMLDivElement>());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const scrolledToMark = useRef<number | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [width, setWidth] = useState(0);
  const [rendered, setRendered] = useState<ReadonlySet<number>>(new Set());
  const [pageText, setPageText] = useState<ReadonlyMap<number, string[]>>(
    new Map(),
  );

  const { data: url, isError } = useQuery({
    queryKey: ["preview", fileKey],
    queryFn: async () => {
      const response = await fetch(
        `/api/s3/presign/get?file_key=${encodeURIComponent(fileKey)}`,
      );
      const result = (await response.json()) as { presignedUrl: string };
      return result.presignedUrl;
    },
    // A new URL would make <Document> download the file again.
    staleTime: Infinity,
  });

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const resize = new ResizeObserver(([entry]) =>
      setWidth(Math.floor(entry.contentRect.width)),
    );
    resize.observe(root);
    const observer = new IntersectionObserver(
      (entries) =>
        setRendered((previous) => {
          const next = new Set(previous);
          for (const entry of entries) {
            const page = Number((entry.target as HTMLElement).dataset.page);
            if (entry.isIntersecting) next.add(page);
            else next.delete(page);
          }
          return next;
        }),
      { root, rootMargin: RENDER_MARGIN },
    );
    pageRefs.current.forEach((element) => observer.observe(element));
    observerRef.current = observer;
    return () => {
      resize.disconnect();
      observer.disconnect();
    };
  }, []);

  const slotRef = useCallback((element: HTMLDivElement) => {
    const page = Number(element.dataset.page);
    pageRefs.current.set(page, element);
    observerRef.current?.observe(element);
    return () => {
      pageRefs.current.delete(page);
      observerRef.current?.unobserve(element);
    };
  }, []);

  useEffect(() => {
    if (!target || !layout) return;
    pageRefs.current.get(target.page)?.scrollIntoView({ block: "start" });
  }, [target, layout]);

  const targetItems = target ? pageText.get(target.page) : undefined;
  const ranges = useMemo(
    () =>
      target && targetItems ? locateExcerpt(targetItems, target.excerpt) : null,
    [target, targetItems],
  );
  const renderHighlight = useMemo(
    () => (ranges ? highlightRenderer(ranges) : undefined),
    [ranges],
  );

  // Stable between citations: react-pdf redraws the text layer whenever this callback changes.
  const scrollToMark = useCallback(() => {
    if (!target || !ranges || scrolledToMark.current === target.seq) return;
    const mark = pageRefs.current.get(target.page)?.querySelector("mark");
    if (!mark) return;
    mark.scrollIntoView({ block: "center" });
    scrolledToMark.current = target.seq;
  }, [target, ranges]);

  const spinner = <Loader2 className="size-12 animate-spin text-emerald-500" />;
  const failure = (
    <p className="text-sm text-slate-500">This PDF couldn&apos;t be loaded.</p>
  );

  return (
    <div ref={scrollRef} className="h-full w-full overflow-y-auto bg-slate-100">
      {isError ? (
        <div className="grid h-full place-items-center">{failure}</div>
      ) : !url ? (
        <div className="grid h-full place-items-center">{spinner}</div>
      ) : (
        <Document
          file={url}
          options={DOCUMENT_OPTIONS}
          // Suspending a page mid-scroll would hide the whole viewer and reset its scroll position.
          suspense={false}
          loading={
            <div className="grid h-full place-items-center">{spinner}</div>
          }
          error={
            <div className="grid h-full place-items-center">{failure}</div>
          }
          onLoadSuccess={async (pdf) => {
            const viewport = (await pdf.getPage(1)).getViewport({ scale: 1 });
            setLayout({
              numPages: pdf.numPages,
              aspect: viewport.height / viewport.width,
            });
          }}
          className="flex flex-col gap-2"
        >
          {layout &&
            width > 0 &&
            Array.from({ length: layout.numPages }, (_, index) => {
              const page = index + 1;
              const isTarget = target?.page === page;
              return (
                <div
                  key={page}
                  ref={slotRef}
                  data-page={page}
                  className="bg-white shadow-sm"
                  style={{ minHeight: width * layout.aspect }}
                >
                  {rendered.has(page) && (
                    <Page
                      pageNumber={page}
                      width={width}
                      renderAnnotationLayer={false}
                      customTextRenderer={
                        isTarget ? renderHighlight : undefined
                      }
                      onGetTextSuccess={({ items }) =>
                        setPageText((previous) =>
                          new Map(previous).set(
                            page,
                            items.map((item) =>
                              "str" in item ? item.str : "",
                            ),
                          ),
                        )
                      }
                      onRenderTextLayerSuccess={
                        isTarget ? scrollToMark : undefined
                      }
                      loading={null}
                    />
                  )}
                </div>
              );
            })}
        </Document>
      )}
    </div>
  );
}

function highlightRenderer(ranges: HighlightRange[]): TextRenderer {
  const byItem = new Map(ranges.map((range) => [range.item, range]));
  return ({ str, itemIndex }) => {
    const range = byItem.get(itemIndex);
    if (!range) return escapeHtml(str);
    return `${escapeHtml(str.slice(0, range.start))}<mark class="rounded-sm bg-amber-300/50 text-transparent">${escapeHtml(str.slice(range.start, range.end))}</mark>${escapeHtml(str.slice(range.end))}`;
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default PDFViewer;

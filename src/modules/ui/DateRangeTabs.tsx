import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/modules/ui/Tabs";
import {
  cn,
  getSelectDropdownMotion,
  selectDropdownTransition,
  selectPanel,
} from "@/modules/ui/selectStyles";
import {
  formatYMD,
  parseYMD,
  type PresetRangeKey,
  type RangeSelection,
} from "@/lib/date-range";

const CUSTOM_VALUE = "custom";
const POPOVER_WIDTH = 300;
const POPOVER_HEIGHT = 360;
const POPOVER_GAP = 8;
const VIEWPORT_MARGIN = 12;

const pad2 = (value: number): string => String(value).padStart(2, "0");

const getDaysInMonth = (year: number, month: number): number =>
  new Date(year, month + 1, 0).getDate();

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const dayKeyOf = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

export function DateRangeTabs({
  value,
  onChange,
  presets = ["today", "yesterday", "7d", "14d", "30d"],
  ariaLabel,
}: {
  value: RangeSelection;
  onChange: (next: RangeSelection) => void;
  presets?: readonly PresetRangeKey[];
  ariaLabel?: string;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  const customAnchorRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<"bottom" | "top">("bottom");
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({
    position: "fixed",
    top: 0,
    left: 0,
    width: POPOVER_WIDTH,
    zIndex: 99999,
  });

  const [draftStart, setDraftStart] = useState<string | null>(null);
  const [draftEnd, setDraftEnd] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Reset draft from the current selection whenever the popover opens.
  useEffect(() => {
    if (!open) return;
    if (value.kind === "custom") {
      setDraftStart(value.start);
      setDraftEnd(value.end);
      const end = parseYMD(value.end);
      if (end) setVisibleMonth(new Date(end.getFullYear(), end.getMonth(), 1));
    } else {
      setDraftStart(null);
      setDraftEnd(null);
      const now = new Date();
      setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    }
  }, [open, value]);

  const updatePosition = useCallback(() => {
    const anchor = customAnchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const viewportWidth = window.innerWidth || 1024;
    const viewportHeight = window.innerHeight || 768;
    const width = Math.max(0, Math.min(POPOVER_WIDTH, viewportWidth - VIEWPORT_MARGIN * 2));
    // Prefer aligning the panel's right edge with the trigger's right edge.
    const left = clamp(
      rect.right - width,
      VIEWPORT_MARGIN,
      Math.max(VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN),
    );
    const spaceBelow = viewportHeight - rect.bottom - POPOVER_GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - POPOVER_GAP - VIEWPORT_MARGIN;
    const openAbove = spaceBelow < POPOVER_HEIGHT && spaceAbove > spaceBelow;
    const top = openAbove
      ? clamp(rect.top - POPOVER_GAP - POPOVER_HEIGHT, VIEWPORT_MARGIN, viewportHeight)
      : clamp(rect.bottom + POPOVER_GAP, VIEWPORT_MARGIN, viewportHeight - VIEWPORT_MARGIN);
    setPlacement(openAbove ? "top" : "bottom");
    setPanelStyle({ position: "fixed", top, left, width, zIndex: 99999 });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (customAnchorRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const monthLabel = useMemo(
    () => visibleMonth.toLocaleDateString(locale, { month: "long", year: "numeric" }),
    [locale, visibleMonth],
  );

  const weekdayLabels = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2027, 0, 3 + index)),
      ),
    [locale],
  );

  const calendarCells = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const currentMonthDays = getDaysInMonth(year, month);
    const previousMonthDays = getDaysInMonth(year, month - 1);
    const startOffset = new Date(year, month, 1).getDay();
    const cellCount = Math.max(35, Math.ceil((startOffset + currentMonthDays) / 7) * 7);

    return Array.from({ length: cellCount }, (_, index) => {
      const dayOffset = index - startOffset + 1;
      if (dayOffset < 1) {
        return { date: new Date(year, month - 1, previousMonthDays + dayOffset), inMonth: false };
      }
      if (dayOffset > currentMonthDays) {
        return { date: new Date(year, month + 1, dayOffset - currentMonthDays), inMonth: false };
      }
      return { date: new Date(year, month, dayOffset), inMonth: true };
    });
  }, [visibleMonth]);

  const handleDayClick = useCallback(
    (date: Date) => {
      const key = dayKeyOf(date);
      if (!draftStart || (draftStart && draftEnd)) {
        setDraftStart(key);
        setDraftEnd(null);
        return;
      }
      if (key < draftStart) {
        setDraftStart(key);
        setDraftEnd(null);
        return;
      }
      if (key === draftStart) {
        setDraftEnd(key);
        return;
      }
      setDraftEnd(key);
    },
    [draftStart, draftEnd],
  );

  const applyDraft = useCallback(() => {
    if (!draftStart || !draftEnd) return;
    onChange({ kind: "custom", start: draftStart, end: draftEnd });
    setOpen(false);
  }, [draftStart, draftEnd, onChange]);

  const todayKey = useMemo(() => dayKeyOf(new Date()), []);

  const presetLabel = (preset: PresetRangeKey): string => {
    switch (preset) {
      case "today":
        return t("common.today");
      case "yesterday":
        return t("common.yesterday");
      case "7d":
        return t("common.n_days", { count: 7 });
      case "14d":
        return t("common.n_days", { count: 14 });
      case "30d":
        return t("common.n_days", { count: 30 });
    }
  };

  const customLabel =
    value.kind === "custom"
      ? `${value.start.slice(5).replace("-", "/")}~${value.end.slice(5).replace("-", "/")}`
      : t("common.custom_range");

  const tabsValue = value.kind === "custom" ? CUSTOM_VALUE : value.preset;

  return (
    <div className="inline-flex max-w-full" aria-label={ariaLabel}>
      <Tabs
        value={tabsValue}
        onValueChange={(next) => {
          if (next === CUSTOM_VALUE) {
            setOpen((prev) => !prev);
            return;
          }
          setOpen(false);
          onChange({ kind: "preset", preset: next as PresetRangeKey });
        }}
      >
        <TabsList>
          {presets.map((preset) => (
            <TabsTrigger key={preset} value={preset}>
              {presetLabel(preset)}
            </TabsTrigger>
          ))}
          <div ref={customAnchorRef} className="inline-flex">
            <TabsTrigger value={CUSTOM_VALUE}>
              <CalendarDays size={12} aria-hidden="true" />
              <span>{customLabel}</span>
            </TabsTrigger>
          </div>
        </TabsList>
      </Tabs>

      {createPortal(
        <AnimatePresence>
          {open ? (
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-label={t("common.custom_range")}
              data-placement={placement}
              className={cn(selectPanel, "p-3 text-[#18181B] dark:text-white")}
              style={panelStyle}
              {...getSelectDropdownMotion(placement)}
              transition={selectDropdownTransition}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  aria-label={t("common.previous_month")}
                  onClick={() =>
                    setVisibleMonth(
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                    )
                  }
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#71717A] transition-colors hover:bg-[#EBEBEC] hover:text-[#18181B] dark:text-[#A1A1AA] dark:hover:bg-[#46464C] dark:hover:text-white"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
                <div className="min-w-0 truncate text-sm font-semibold">{monthLabel}</div>
                <button
                  type="button"
                  aria-label={t("common.next_month")}
                  onClick={() =>
                    setVisibleMonth(
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                    )
                  }
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#71717A] transition-colors hover:bg-[#EBEBEC] hover:text-[#18181B] dark:text-[#A1A1AA] dark:hover:bg-[#46464C] dark:hover:text-white"
                >
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-[#96969B] dark:text-[#9F9FA8]">
                {weekdayLabels.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {calendarCells.map(({ date, inMonth }) => {
                  const key = dayKeyOf(date);
                  const isStart = draftStart === key;
                  const isEnd = draftEnd === key;
                  const inRange =
                    draftStart !== null &&
                    draftEnd !== null &&
                    key > draftStart &&
                    key < draftEnd;
                  const selected = isStart || isEnd;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-label={formatYMD(date)}
                      aria-pressed={selected}
                      onClick={() => handleDayClick(date)}
                      className={cn(
                        "h-8 rounded-xl text-xs font-semibold tabular-nums transition-colors",
                        selected
                          ? "bg-[#18181B] text-white dark:bg-white dark:text-[#18181B]"
                          : inRange
                            ? "bg-[#18181B]/10 text-[#18181B] dark:bg-white/15 dark:text-white"
                            : "text-[#18181B] hover:bg-[#EBEBEC] dark:text-white dark:hover:bg-[#46464C]",
                        !inMonth && !selected && !inRange ? "opacity-35" : null,
                        key === todayKey && !selected ? "ring-1 ring-[#18181B]/20 dark:ring-white/25" : null,
                      )}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/[0.06] pt-3 dark:border-white/10">
                <div className="min-w-0 flex-1 truncate text-[11px] tabular-nums text-[#71717A] dark:text-[#A1A1AA]">
                  {draftStart
                    ? `${draftStart} ~ ${draftEnd ?? "…"}`
                    : t("common.range_hint")}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold text-[#71717A] transition-colors hover:bg-[#EBEBEC] hover:text-[#18181B] dark:text-[#A1A1AA] dark:hover:bg-[#46464C] dark:hover:text-white"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={applyDraft}
                    disabled={!draftStart || !draftEnd}
                    className="rounded-full bg-[#18181B] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#27272A] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-[#18181B] dark:hover:bg-[#E4E4E7]"
                  >
                    {t("common.confirm")}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

"use client";

// The app's only Recharts consumer — reached exclusively through
// analytics-view.tsx's dynamic import, so this module (and the Recharts
// chunk it pulls in) never enters the shared bundle. See the color-mapping
// comments below for how the `dataviz` skill's guidance was applied within
// the brief's "app CSS-var tokens only" constraint.
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { AnalyticsData } from "@/lib/analytics";
import { SOURCE_LABELS, STAGE_LABELS, type Source, type Stage } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { funnelTakeaway, sourceTakeaway, timeInStageTakeaway, velocityTakeaway } from "./chart-copy";

const CHART_HEIGHT = 260;

const TOOLTIP_CONTENT_STYLE: React.CSSProperties = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 13,
  padding: "8px 10px",
  boxShadow: "0 4px 12px rgb(0 0 0 / 0.12)",
};
const TOOLTIP_LABEL_STYLE: React.CSSProperties = { color: "var(--text-2)", marginBottom: 4, fontWeight: 500 };
const TOOLTIP_ITEM_STYLE: React.CSSProperties = { color: "var(--text)", padding: 0 };
const AXIS_TICK = { fill: "var(--text-2)", fontSize: 12 };
const AXIS_LINE = { stroke: "var(--border)" };

/** Every pipeline-stage bar (funnel + time-in-stage) reuses the same `--stage-*-fg`
 * tokens the rest of the app already uses for that stage (StageBadge, the
 * dashboard's StageOverview bars) — see the report for why this wins over
 * dataviz's default "ordinal = one hue" guidance here. */
const stageFill = (stage: Stage) => `var(--stage-${stage}-fg)`;

/**
 * Fixed source -> color mapping, keyed by entity (never by sort rank — see
 * `references/anti-patterns.md`'s "recolor-on-filter": a source's color must
 * never depend on where it lands in the count-sorted `bySource` array).
 *
 * These are the app's existing multi-hue design tokens, reused here because
 * the brief pins chart colors to app CSS vars and the design system has no
 * dedicated categorical ramp. `validate_palette.js` genuinely FAILs this set
 * (documented in the task report) — the app's stage tokens were designed as
 * independently-legible badge tints, not a pairwise-distinct chart palette,
 * and dark-mode text tokens in particular cluster in the light band. Given
 * the brief's token constraint, the mitigation is architectural rather than
 * color-only: identity never rests on hue alone here — every slice has a
 * legend row (swatch + label + count) and the sr-only table restates every
 * number. `--stage-rejected`/`--danger` (red) is deliberately excluded, since
 * that hue is reserved elsewhere in the app for the "rejected" status: reusing
 * a reserved status color for an unrelated series is its own anti-pattern.
 * "Other" gets a neutral de-emphasis tint instead of a contrived 6th hue.
 */
const SOURCE_COLOR: Record<Source, string> = {
  "job-board": "var(--stage-screening-fg)",
  referral: "var(--stage-hired-fg)",
  agency: "var(--stage-offer-fg)",
  outbound: "var(--stage-interview-fg)",
  "career-page": "var(--accent)",
  other: "var(--text-3)",
};

const numberFormatter = (noun: string) => (value: ValueType | undefined) => {
  const n = Number(value ?? 0);
  return [`${n} ${noun}${n === 1 ? "" : "s"}`, undefined] as const;
};

function ChartFigure({
  title,
  takeaway,
  children,
  table,
}: {
  title: string;
  takeaway: string;
  children: React.ReactNode;
  table: React.ReactNode;
}) {
  return (
    <figure className="rounded-lg border border-border bg-surface p-5">
      <figcaption>
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        <p className="mt-0.5 text-xs text-text-3">{takeaway}</p>
      </figcaption>
      {/* The chart is a decorative rendering of the same numbers the sr-only
          table below states explicitly — hiding it from assistive tech avoids
          screen readers either walking Recharts' internal SVG structure or
          announcing every figure twice. Every chart root below also sets
          `accessibilityLayer={false}`: Recharts v3 defaults that on, adding
          its own focusable `role="application"` layer with independent
          keyboard nav — verified live (Chromium a11y tree) that a focusable
          descendant isn't suppressed by an ancestor's `aria-hidden` the way
          static content is, so leaving it on would both strand a second,
          competing a11y story here and double-announce every value already
          in the table. With it off, nothing inside is keyboard-focusable, so
          this wrapper doesn't strand any interactive control outside the
          accessibility tree. */}
      <div aria-hidden="true" className="mt-4" style={{ height: CHART_HEIGHT }}>
        {children}
      </div>
      <table className="sr-only">{table}</table>
    </figure>
  );
}

export interface ChartProps {
  reduceMotion: boolean | null;
}

/** 1. Hiring funnel — horizontal bar, one bar per stage the candidate ever reached. */
export function FunnelChart({ funnel, reduceMotion }: { funnel: AnalyticsData["funnel"] } & ChartProps) {
  const data = funnel.map((f) => ({ ...f, label: STAGE_LABELS[f.stage] }));
  const maxCount = Math.max(1, ...data.map((d) => d.count));

  return (
    <ChartFigure
      title="Hiring funnel"
      takeaway={funnelTakeaway(funnel)}
      table={
        <>
          <caption>Hiring funnel — candidates who ever reached each stage</caption>
          <thead>
            <tr>
              <th scope="col">Stage</th>
              <th scope="col">Candidates</th>
            </tr>
          </thead>
          <tbody>
            {funnel.map((f) => (
              <tr key={f.stage}>
                <th scope="row">{STAGE_LABELS[f.stage]}</th>
                <td>{f.count}</td>
              </tr>
            ))}
          </tbody>
        </>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 28, bottom: 4, left: 4 }}
          barCategoryGap="28%"
          accessibilityLayer={false}
        >
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis
            type="number"
            allowDecimals={false}
            domain={[0, maxCount]}
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={false}
          />
          <YAxis type="category" dataKey="label" width={82} tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} />
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            contentStyle={TOOLTIP_CONTENT_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            formatter={numberFormatter("candidate")}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24} isAnimationActive={!reduceMotion}>
            {data.map((d) => (
              <Cell key={d.stage} fill={stageFill(d.stage)} />
            ))}
            <LabelList dataKey="count" position="right" fill="var(--text-2)" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}

/** 2. Avg time in stage — vertical bar, y-axis in days. */
export function TimeInStageChart({
  timeInStage,
  reduceMotion,
}: { timeInStage: AnalyticsData["timeInStage"] } & ChartProps) {
  const data = timeInStage.map((t) => ({ ...t, label: STAGE_LABELS[t.stage] }));

  return (
    <ChartFigure
      title="Avg. time in stage"
      takeaway={timeInStageTakeaway(timeInStage)}
      table={
        <>
          <caption>Average days spent in each stage</caption>
          <thead>
            <tr>
              <th scope="col">Stage</th>
              <th scope="col">Avg. days</th>
            </tr>
          </thead>
          <tbody>
            {timeInStage.map((t) => (
              <tr key={t.stage}>
                <th scope="row">{STAGE_LABELS[t.stage]}</th>
                <td>{t.avgDays}</td>
              </tr>
            ))}
          </tbody>
        </>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 16, right: 8, bottom: 4, left: 4 }}
          barCategoryGap="28%"
          accessibilityLayer={false}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} />
          <YAxis
            allowDecimals={false}
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={false}
            width={36}
            label={{ value: "Days", angle: -90, position: "insideLeft", fill: "var(--text-3)", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            contentStyle={TOOLTIP_CONTENT_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            formatter={numberFormatter("day")}
          />
          <Bar dataKey="avgDays" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={!reduceMotion}>
            {data.map((d) => (
              <Cell key={d.stage} fill={stageFill(d.stage)} />
            ))}
            <LabelList dataKey="avgDays" position="top" fill="var(--text-2)" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}

/** 3. Candidates by source — donut with a swatch+label+count legend (identity never rests on color alone). */
export function SourceChart({ bySource, reduceMotion }: { bySource: AnalyticsData["bySource"] } & ChartProps) {
  return (
    <ChartFigure
      title="Candidates by source"
      takeaway={sourceTakeaway(bySource)}
      table={
        <>
          <caption>Candidates by source</caption>
          <thead>
            <tr>
              <th scope="col">Source</th>
              <th scope="col">Candidates</th>
            </tr>
          </thead>
          <tbody>
            {bySource.map((s) => (
              <tr key={s.source}>
                <th scope="row">{SOURCE_LABELS[s.source]}</th>
                <td>{s.count}</td>
              </tr>
            ))}
          </tbody>
        </>
      }
    >
      <div className="flex h-full flex-col items-center gap-3 sm:flex-row sm:gap-4">
        <div className="h-full w-full shrink-0 sm:max-w-[45%]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart accessibilityLayer={false}>
              <Pie
                data={bySource}
                dataKey="count"
                nameKey="source"
                innerRadius="58%"
                outerRadius="92%"
                paddingAngle={2}
                stroke="var(--surface)"
                strokeWidth={2}
                isAnimationActive={!reduceMotion}
                // Pie renders its own focusable <g tabindex="0">
                // (rootTabIndex defaults to 0 in recharts' Pie component)
                // independently of the chart root's `accessibilityLayer`
                // prop above — axe's aria-hidden-focus rule caught it inside
                // this figure's `aria-hidden="true"` wrapper (see
                // ChartFigure's doc comment for why the wrapper is hidden at
                // all). -1 keeps it out of the tab order like every other
                // element in a decorative chart.
                rootTabIndex={-1}
              >
                {bySource.map((s) => (
                  <Cell key={s.source} fill={SOURCE_COLOR[s.source]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP_CONTENT_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
                itemStyle={TOOLTIP_ITEM_STYLE}
                formatter={(value, _name, item) => {
                  const n = Number(value ?? 0);
                  const source = (item?.payload as { source: Source } | undefined)?.source;
                  return [`${n} candidate${n === 1 ? "" : "s"}`, source ? SOURCE_LABELS[source] : ""];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex w-full min-w-0 flex-1 flex-col gap-2 text-sm">
          {bySource.map((s) => (
            <li key={s.source} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: SOURCE_COLOR[s.source] }}
                />
                <span className="truncate text-text-2">{SOURCE_LABELS[s.source]}</span>
              </span>
              <span className="shrink-0 font-medium tabular-nums text-text">{s.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </ChartFigure>
  );
}

/** 4. Pipeline velocity — single-series line, stage moves per week over the last 8 weeks. */
export function VelocityChart({ velocity, reduceMotion }: { velocity: AnalyticsData["velocity"] } & ChartProps) {
  const data = velocity.map((v) => ({ ...v, label: formatDate(v.weekStart) }));

  return (
    <ChartFigure
      title="Pipeline velocity"
      takeaway={velocityTakeaway(velocity)}
      table={
        <>
          <caption>Stage moves per week, last 8 weeks</caption>
          <thead>
            <tr>
              <th scope="col">Week of</th>
              <th scope="col">Stage moves</th>
            </tr>
          </thead>
          <tbody>
            {velocity.map((v) => (
              <tr key={v.weekStart}>
                <th scope="row">{formatDate(v.weekStart)}</th>
                <td>{v.moves}</td>
              </tr>
            ))}
          </tbody>
        </>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 16, bottom: 4, left: 4 }} accessibilityLayer={false}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} />
          <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} width={28} />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            contentStyle={TOOLTIP_CONTENT_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            formatter={numberFormatter("move")}
          />
          <Line
            type="monotone"
            dataKey="moves"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={{ r: 4, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
            activeDot={{ r: 5, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={!reduceMotion}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}

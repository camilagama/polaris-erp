"use client";

import {
  type ComponentProps,
  type ComponentType,
  type CSSProperties,
  createContext,
  type ReactNode,
  useContext,
  useId,
  useMemo,
} from "react";
import type { TooltipValueType } from "recharts";
import {
  type DefaultLegendContentProps,
  type DefaultTooltipContentProps,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";

const THEMES = { light: "", dark: ".dark" } as const;
const INITIAL_DIMENSION = { height: 200, width: 320 } as const;
const DEFAULT_CHART_RESIZE_DEBOUNCE = 16;

type TooltipNameType = number | string;
type TooltipPayloadItem = NonNullable<
  DefaultTooltipContentProps<TooltipValueType, TooltipNameType>["payload"]
>[number];

export type ChartConfig = Record<
  string,
  {
    icon?: ComponentType;
    label?: ReactNode;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
>;

interface ChartContextProps {
  config: ChartConfig;
}

interface ChartTooltipContentProps
  extends Omit<ComponentProps<typeof Tooltip>, "content"> {
  className?: string;
  color?: string;
  hideIndicator?: boolean;
  hideLabel?: boolean;
  indicator?: "dashed" | "dot" | "line";
  labelKey?: string;
  nameKey?: string;
}

interface ChartLegendContentProps extends DefaultLegendContentProps {
  className?: string;
  hideIcon?: boolean;
  nameKey?: string;
}

const ChartContext = createContext<ChartContextProps | null>(null);

const getChartStyles = ({
  config,
  id,
}: {
  config: ChartConfig;
  id: string;
}) => {
  const colorConfig = Object.entries(config).filter(
    ([, itemConfig]) => itemConfig.theme ?? itemConfig.color
  );

  if (colorConfig.length === 0) {
    return "";
  }

  return Object.entries(THEMES)
    .map(
      ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ??
      itemConfig.color;

    return color ? `  --color-${key}: ${color};` : null;
  })
  .filter(Boolean)
  .join("\n")}
}
`
    )
    .join("\n");
};

const getPayloadConfigFromPayload = (
  config: ChartConfig,
  payload: unknown,
  key: string
) => {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const payloadData =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined;

  let configKey = key;

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    configKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadData &&
    key in payloadData &&
    typeof payloadData[key as keyof typeof payloadData] === "string"
  ) {
    configKey = payloadData[key as keyof typeof payloadData] as string;
  }

  return configKey in config ? config[configKey] : config[key];
};

const getPayloadValueKey = ({
  fallbackKey,
  nameKey,
  payload,
}: {
  fallbackKey: string;
  nameKey?: string;
  payload: unknown;
}) => {
  if (typeof payload !== "object" || payload === null || !nameKey) {
    return fallbackKey;
  }

  if (
    nameKey in payload &&
    typeof payload[nameKey as keyof typeof payload] === "string"
  ) {
    return payload[nameKey as keyof typeof payload] as string;
  }

  const payloadData =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined;

  if (
    payloadData &&
    nameKey in payloadData &&
    typeof payloadData[nameKey as keyof typeof payloadData] === "string"
  ) {
    return payloadData[nameKey as keyof typeof payloadData] as string;
  }

  return fallbackKey;
};

function useChart() {
  const context = useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

function TooltipIndicator({
  color,
  indicator,
  nestedLabel,
}: {
  color?: string;
  indicator: "dashed" | "dot" | "line";
  nestedLabel: boolean;
}) {
  return (
    <div
      className={cn(
        "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
        {
          "h-2.5 w-2.5": indicator === "dot",
          "my-0.5": nestedLabel && indicator === "dashed",
          "w-0 border-[1.5px] border-dashed bg-transparent":
            indicator === "dashed",
          "w-1": indicator === "line",
        }
      )}
      style={
        {
          "--color-bg": color,
          "--color-border": color,
        } as CSSProperties
      }
    />
  );
}

function DefaultTooltipRow({
  formatter,
  hideIndicator,
  indicator,
  indicatorColor,
  item,
  itemConfig,
  itemIndex,
  nestedLabel,
  tooltipLabel,
}: {
  formatter: ChartTooltipContentProps["formatter"];
  hideIndicator: boolean;
  indicator: "dashed" | "dot" | "line";
  indicatorColor?: string;
  item: TooltipPayloadItem;
  itemConfig?: ChartConfig[string];
  itemIndex: number;
  nestedLabel: boolean;
  tooltipLabel: ReactNode;
}) {
  let indicatorNode: ReactNode = null;

  if (itemConfig?.icon) {
    indicatorNode = <itemConfig.icon />;
  } else if (!hideIndicator) {
    indicatorNode = (
      <TooltipIndicator
        color={indicatorColor}
        indicator={indicator}
        nestedLabel={nestedLabel}
      />
    );
  }

  if (formatter && item.value !== undefined && item.name) {
    return formatter(item.value, item.name, item, itemIndex, item.payload);
  }

  return (
    <>
      {indicatorNode}
      <div
        className={cn(
          "flex flex-1 justify-between leading-none",
          nestedLabel ? "items-end" : "items-center"
        )}
      >
        <div className="grid gap-1.5">
          {nestedLabel ? tooltipLabel : null}
          <span className="text-muted-foreground">
            {itemConfig?.label ?? item.name}
          </span>
        </div>
        {item.value == null ? null : (
          <span className="font-medium font-mono text-foreground tabular-nums">
            {typeof item.value === "number"
              ? item.value.toLocaleString()
              : String(item.value)}
          </span>
        )}
      </div>
    </>
  );
}

function ChartContainer({
  id,
  className,
  children,
  config,
  initialDimension = INITIAL_DIMENSION,
  resizeDebounce = DEFAULT_CHART_RESIZE_DEBOUNCE,
  ...props
}: ComponentProps<"div"> & {
  children: ComponentProps<typeof ResponsiveContainer>["children"];
  config: ChartConfig;
  initialDimension?: {
    height: number;
    width: number;
  };
  resizeDebounce?: ComponentProps<typeof ResponsiveContainer>["debounce"];
}) {
  const uniqueId = useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;
  const styles = getChartStyles({ config, id: chartId });

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        className={cn(
          "flex h-full justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-hidden [&_.recharts-surface]:outline-hidden",
          className
        )}
        data-chart={chartId}
        data-slot="chart"
        {...props}
      >
        {styles ? <style>{styles}</style> : null}
        <ResponsiveContainer
          debounce={resizeDebounce}
          initialDimension={initialDimension}
        >
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartTooltip = Tooltip;

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideIndicator = false,
  hideLabel = false,
  label,
  labelClassName,
  labelFormatter,
  formatter,
  color,
  nameKey,
  labelKey,
}: ChartTooltipContentProps &
  Omit<
    DefaultTooltipContentProps<TooltipValueType, TooltipNameType>,
    "accessibilityLayer"
  >) {
  const { config } = useChart();
  const visiblePayload = payload?.filter((item) => item.type !== "none") ?? [];

  const tooltipLabel = useMemo(() => {
    if (hideLabel || visiblePayload.length === 0) {
      return null;
    }

    const [item] = visiblePayload;
    const itemKey = `${labelKey ?? item?.dataKey ?? item?.name ?? "value"}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, itemKey);
    const value =
      !labelKey && typeof label === "string"
        ? (config[label]?.label ?? label)
        : itemConfig?.label;

    if (labelFormatter) {
      return (
        <div className={cn("font-medium", labelClassName)}>
          {labelFormatter(value, visiblePayload)}
        </div>
      );
    }

    return value ? (
      <div className={cn("font-medium", labelClassName)}>{value}</div>
    ) : null;
  }, [
    config,
    hideLabel,
    label,
    labelClassName,
    labelFormatter,
    labelKey,
    visiblePayload,
  ]);

  if (!(active && visiblePayload.length > 0)) {
    return null;
  }

  const nestedLabel = visiblePayload.length === 1 && indicator !== "dot";

  return (
    <div
      className={cn(
        "grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs/relaxed shadow-xl",
        className
      )}
    >
      {nestedLabel ? null : tooltipLabel}
      <div className="grid gap-1.5">
        {visiblePayload.map((item, itemIndex) => {
          const itemKey = `${nameKey ?? item.name ?? item.dataKey ?? "value"}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, itemKey);
          const indicatorColor = color ?? item.payload?.fill ?? item.color;
          const rowKey = getPayloadValueKey({
            fallbackKey: `${itemKey}-${String(item.value ?? item.color ?? itemIndex)}`,
            nameKey,
            payload: item,
          });

          return (
            <div
              className={cn(
                "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                indicator === "dot" ? "items-center" : null
              )}
              key={rowKey}
            >
              <DefaultTooltipRow
                formatter={formatter}
                hideIndicator={hideIndicator}
                indicator={indicator}
                indicatorColor={indicatorColor}
                item={item}
                itemConfig={itemConfig}
                itemIndex={itemIndex}
                nestedLabel={nestedLabel}
                tooltipLabel={tooltipLabel}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ChartLegend = Legend;

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: ChartLegendContentProps) {
  const { config } = useChart();
  const visiblePayload = payload?.filter((item) => item.type !== "none") ?? [];

  if (visiblePayload.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
    >
      {visiblePayload.map((item) => {
        const itemKey = `${nameKey ?? item.dataKey ?? "value"}`;
        const itemConfig = getPayloadConfigFromPayload(config, item, itemKey);
        const legendKey = getPayloadValueKey({
          fallbackKey: itemKey,
          nameKey,
          payload: item,
        });

        return (
          <div
            className={cn(
              "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
            )}
            key={legendKey}
          >
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: item.color }}
              />
            )}
            {itemConfig?.label}
          </div>
        );
      })}
    </div>
  );
}

const ChartStyle = ({ id, config }: { config: ChartConfig; id: string }) => {
  const styles = getChartStyles({ config, id });

  return styles ? <style>{styles}</style> : null;
};

export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
};

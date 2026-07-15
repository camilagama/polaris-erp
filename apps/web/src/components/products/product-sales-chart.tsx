"use client";

import { AreaPerformanceChart } from "@polaris/ui/components/shared/area-performance-chart";
import type { ChartConfig } from "@polaris/ui/components/ui/chart";
import type {
  ProductCatalogPerformancePoint,
  ProductSalesPoint,
} from "@/features/products/contracts";

const catalogChartConfig = {
  purchaseAmount: {
    color: "var(--chart-4)",
    label: "Compras",
  },
  soldAmount: {
    color: "var(--chart-1)",
    label: "Faturamento",
  },
} satisfies ChartConfig;

const unitsChartConfig = {
  quantitySold: {
    color: "var(--chart-3)",
    label: "Unidades vendidas",
  },
} satisfies ChartConfig;

export function ProductCatalogPerformanceChart({
  data,
  emptyLabel,
}: {
  data: ProductCatalogPerformancePoint[];
  emptyLabel: string;
}) {
  return (
    <AreaPerformanceChart
      config={catalogChartConfig}
      data={data}
      emptyLabel={emptyLabel}
      formatType="currency"
      lines={[
        { dataKey: "soldAmount", fillOpacity: 0.28 },
        { dataKey: "purchaseAmount", fillOpacity: 0.22 },
      ]}
    />
  );
}

export function ProductUnitsSoldChart({
  data,
  emptyLabel,
}: {
  data: ProductSalesPoint[];
  emptyLabel: string;
}) {
  return (
    <AreaPerformanceChart
      config={unitsChartConfig}
      data={data}
      emptyLabel={emptyLabel}
      formatType="number"
      lines={[{ dataKey: "quantitySold", fillOpacity: 0.22 }]}
    />
  );
}

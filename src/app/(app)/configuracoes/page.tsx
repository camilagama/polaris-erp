import {
  FeedbackBanner,
  PageLayout,
  Surface,
} from "@/app/(app)/_components/page-layout";
import { saveSettingsAction } from "@/app/(app)/configuracoes/actions";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { getSearchParamValue } from "@/lib/action-feedback";

const inputClassName =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [settingsRows, resolvedSearchParams] = await Promise.all([
    db.select().from(systemSettings).limit(1),
    searchParams,
  ]);
  const settings = settingsRows[0];
  const error = getSearchParamValue(resolvedSearchParams.error);
  const message = getSearchParamValue(resolvedSearchParams.message);

  return (
    <PageLayout
      description="Parametros simples da V1 para guiar estoque critico, margem alvo e leitura operacional do dashboard."
      eyebrow="Parametros"
      title="Configuracoes"
    >
      <FeedbackBanner error={error} message={message} />

      <Surface className="max-w-3xl">
        <div className="mb-5 space-y-2">
          <h2 className="font-semibold text-lg">Parametros do sistema</h2>
          <p className="text-muted-foreground text-sm">
            Esses valores alimentam alertas e indicadores operacionais.
          </p>
        </div>
        <form action={saveSettingsAction} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label
              className="font-medium text-sm"
              htmlFor="targetMarginPercent"
            >
              Margem alvo (%)
            </label>
            <input
              className={inputClassName}
              defaultValue={settings?.targetMarginPercent ?? "25.00"}
              id="targetMarginPercent"
              min="0"
              name="targetMarginPercent"
              step="0.01"
              type="number"
            />
          </div>
          <div className="space-y-2">
            <label
              className="font-medium text-sm"
              htmlFor="minimumMarginPercent"
            >
              Margem minima (%)
            </label>
            <input
              className={inputClassName}
              defaultValue={settings?.minimumMarginPercent ?? "15.00"}
              id="minimumMarginPercent"
              min="0"
              name="minimumMarginPercent"
              step="0.01"
              type="number"
            />
          </div>
          <div className="space-y-2">
            <label
              className="font-medium text-sm"
              htmlFor="estimatedFeePercent"
            >
              Taxa estimada (%)
            </label>
            <input
              className={inputClassName}
              defaultValue={settings?.estimatedFeePercent ?? "5.00"}
              id="estimatedFeePercent"
              min="0"
              name="estimatedFeePercent"
              step="0.01"
              type="number"
            />
          </div>
          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="lowStockThreshold">
              Limite de estoque critico
            </label>
            <input
              className={inputClassName}
              defaultValue={settings?.lowStockThreshold ?? 2}
              id="lowStockThreshold"
              min="0"
              name="lowStockThreshold"
              step="1"
              type="number"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="font-medium text-sm" htmlFor="staleProductDays">
              Dias para considerar produto parado
            </label>
            <input
              className={inputClassName}
              defaultValue={settings?.staleProductDays ?? 45}
              id="staleProductDays"
              min="1"
              name="staleProductDays"
              step="1"
              type="number"
            />
          </div>
          <div className="md:col-span-2">
            <button
              className="h-10 rounded-xl bg-primary px-4 font-medium text-primary-foreground text-sm transition hover:bg-primary/90"
              type="submit"
            >
              Salvar configuracoes
            </button>
          </div>
        </form>
      </Surface>
    </PageLayout>
  );
}

"use client";

import {
  Alert01Icon,
  InformationCircleIcon,
  Loading02Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTheme } from "next-themes";
import { toast as originalToast, Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      className="toaster group"
      closeButton
      icons={{
        success: (
          <HugeiconsIcon
            className="text-emerald-500 dark:text-emerald-400"
            icon={Tick02Icon}
            strokeWidth={2}
          />
        ),
        error: (
          <HugeiconsIcon
            className="text-destructive dark:text-destructive"
            icon={Alert01Icon}
            strokeWidth={2}
          />
        ),
        warning: (
          <HugeiconsIcon
            className="text-amber-500 dark:text-amber-400"
            icon={Alert01Icon}
            strokeWidth={2}
          />
        ),
        info: (
          <HugeiconsIcon
            className="text-blue-500 dark:text-blue-400"
            icon={InformationCircleIcon}
            strokeWidth={2}
          />
        ),
        loading: (
          <HugeiconsIcon
            className="animate-spin text-muted-foreground"
            icon={Loading02Icon}
            strokeWidth={2}
          />
        ),
      }}
      theme={theme as ToasterProps["theme"]}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl font-sans",
          description: "group-[.toast]:text-muted-foreground font-sans",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-medium group-[.toast]:rounded-md font-sans",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:font-medium group-[.toast]:rounded-md font-sans",
          closeButton:
            "group-[.toast]:bg-popover group-[.toast]:text-foreground group-[.toast]:border-border group-[.toast]:hover:bg-muted group-[.toast]:hover:text-foreground",
          icon: "group-[.toast]:[&>svg]:size-5",
        },
      }}
      {...props}
    />
  );
};

type ExternalToast = import("sonner").ExternalToast;

const enrichToastData = (data: ExternalToast = {}) => {
  // Se houver ação explícita e não tivermos `closeButton` predefinido
  if (data?.action) {
    return { ...data, closeButton: data.closeButton ?? true };
  }
  // Se não houver botão de ação nem botão de cancel, crie um "Fechar" no lugar da ação primária/cancel.
  if (!data?.cancel) {
    return {
      ...data,
      closeButton: false, // Desliga o X porque vamos ter um botão claro "Fechar"
      cancel: { label: "Fechar", onClick: () => originalToast.dismiss() },
    };
  }
  return data;
};

// Exportamos o toast interceptado pra prover o visual da DG
const toast = Object.assign(
  (message: string | React.ReactNode, data?: ExternalToast) =>
    originalToast(message, enrichToastData(data)),
  originalToast,
  {
    success: (msg: string | React.ReactNode, data?: ExternalToast) =>
      originalToast.success(msg, enrichToastData(data)),
    error: (msg: string | React.ReactNode, data?: ExternalToast) =>
      originalToast.error(msg, enrichToastData(data)),
    info: (msg: string | React.ReactNode, data?: ExternalToast) =>
      originalToast.info(msg, enrichToastData(data)),
    warning: (msg: string | React.ReactNode, data?: ExternalToast) =>
      originalToast.warning(msg, enrichToastData(data)),
    loading: (msg: string | React.ReactNode, data?: ExternalToast) =>
      originalToast.loading(msg, enrichToastData(data)),
    message: (msg: string | React.ReactNode, data?: ExternalToast) =>
      originalToast.message(msg, enrichToastData(data)),
  }
);

export { Toaster, toast };

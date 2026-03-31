"use client";

import { useForm } from "@tanstack/react-form";
import { type ChangeEvent, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { createProductAction } from "@/app/(app)/produtos/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OTHERS_CATEGORY_KEY } from "@/features/catalog/constants";
import { calculateSuggestedPrices } from "@/features/catalog/pricing";

const productSchema = z.object({
  name: z.string().min(1, "Nome e obrigatorio"),
  description: z.string().optional().default(""),
  categoryId: z.string().min(1, "Categoria e obrigatoria"),
  costPrice: z.coerce.number().min(0, "Minimo 0"),
  price: z.coerce.number().min(0, "Minimo 0"),
  stock: z.coerce.number().min(0, "Minimo 0"),
});

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value);

interface ProductCategoryOption {
  id: string;
  key: string;
  name: string;
}

interface RegisterProductDialogProps {
  categories: ProductCategoryOption[];
  settings: {
    idealMarkupPercent: number;
    minimumMarkupPercent: number;
  };
}

export function RegisterProductDialog({
  categories,
  settings,
}: RegisterProductDialogProps) {
  const [open, setOpen] = useState(false);
  const defaultCategoryId =
    categories.find((category) => category.key === OTHERS_CATEGORY_KEY)?.id ??
    categories[0]?.id ??
    "";

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      categoryId: defaultCategoryId,
      costPrice: 0,
      price: 0,
      stock: 0,
    },
    onSubmit: async ({ value }) => {
      try {
        await createProductAction({
          name: value.name,
          description: value.description || undefined,
          categoryId: value.categoryId,
          costPrice: value.costPrice.toString(),
          price: value.price.toString(),
          stock: value.stock,
        });
        toast.success("Produto cadastrado.");
        setOpen(false);
        form.reset();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel cadastrar o produto."
        );
      }
    },
  });

  const resetForm = () => {
    form.reset({
      categoryId: defaultCategoryId,
      costPrice: 0,
      description: "",
      name: "",
      price: 0,
      stock: 0,
    });
  };

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          resetForm();
        }
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button>Cadastrar Produto</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Novo Produto</DialogTitle>
          <DialogDescription>
            Adicione um novo produto e registre sua entrada inicial no estoque.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="flex flex-col gap-4 py-4">
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) => {
                  const result = productSchema.shape.name.safeParse(value);
                  return result.success
                    ? undefined
                    : result.error.issues[0]?.message;
                },
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={field.name}>Nome do Produto</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Ex: iPhone 16 Pro Max"
                    value={field.state.value}
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <em className="text-[11px] text-destructive">
                      {field.state.meta.errors.join(", ")}
                    </em>
                  ) : null}
                </div>
              )}
            </form.Field>

            <form.Field
              name="categoryId"
              validators={{
                onChange: ({ value }) => {
                  const result =
                    productSchema.shape.categoryId.safeParse(value);
                  return result.success
                    ? undefined
                    : result.error.issues[0]?.message;
                },
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={field.name}>Categoria</Label>
                  <Select
                    onValueChange={field.handleChange}
                    value={field.state.value}
                  >
                    <SelectTrigger className="w-full" id={field.name}>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.state.meta.errors.length > 0 ? (
                    <em className="text-[11px] text-destructive">
                      {field.state.meta.errors.join(", ")}
                    </em>
                  ) : null}
                </div>
              )}
            </form.Field>

            <form.Field name="description">
              {(field) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={field.name}>Descricao</Label>
                  <InputGroup className="h-auto">
                    <InputGroupTextarea
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Detalhes sobre versao, cor, etc..."
                      value={field.state.value}
                    />
                  </InputGroup>
                </div>
              )}
            </form.Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <form.Field
                name="costPrice"
                validators={{
                  onChange: ({ value }) => {
                    const result =
                      productSchema.shape.costPrice.safeParse(value);
                    return result.success
                      ? undefined
                      : result.error.issues[0]?.message;
                  },
                }}
              >
                {(field) => {
                  const handleChange = (
                    event: ChangeEvent<HTMLInputElement>
                  ) => {
                    let nextValue = event.target.value;

                    if (nextValue.includes(".")) {
                      const [integer, decimal] = nextValue.split(".");
                      if (decimal.length > 2) {
                        nextValue = `${integer}.${decimal.slice(0, 2)}`;
                      }
                    }

                    field.handleChange(Number(nextValue));
                  };

                  return (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={field.name}>Custo Unitario</Label>
                      <InputGroup>
                        <InputGroupAddon>
                          <InputGroupText>R$</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                          id={field.name}
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={handleChange}
                          placeholder="0.00"
                          step="0.01"
                          type="number"
                          value={field.state.value}
                        />
                      </InputGroup>
                      {field.state.meta.errors.length > 0 ? (
                        <em className="text-[11px] text-destructive">
                          {field.state.meta.errors.join(", ")}
                        </em>
                      ) : null}
                    </div>
                  );
                }}
              </form.Field>

              <form.Field
                name="price"
                validators={{
                  onChange: ({ value }) => {
                    const result = productSchema.shape.price.safeParse(value);
                    return result.success
                      ? undefined
                      : result.error.issues[0]?.message;
                  },
                }}
              >
                {(field) => {
                  const handleChange = (
                    event: ChangeEvent<HTMLInputElement>
                  ) => {
                    let nextValue = event.target.value;

                    if (nextValue.includes(".")) {
                      const [integer, decimal] = nextValue.split(".");
                      if (decimal.length > 2) {
                        nextValue = `${integer}.${decimal.slice(0, 2)}`;
                      }
                    }

                    field.handleChange(Number(nextValue));
                  };

                  return (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={field.name}>Preco de Venda</Label>
                      <InputGroup>
                        <InputGroupAddon>
                          <InputGroupText>R$</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                          id={field.name}
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={handleChange}
                          placeholder="0.00"
                          step="0.01"
                          type="number"
                          value={field.state.value}
                        />
                      </InputGroup>
                      {field.state.meta.errors.length > 0 ? (
                        <em className="text-[11px] text-destructive">
                          {field.state.meta.errors.join(", ")}
                        </em>
                      ) : null}
                    </div>
                  );
                }}
              </form.Field>
            </div>

            <form.Subscribe
              selector={(state) => [state.values.costPrice, state.values.price]}
            >
              {([costPrice, price]) => {
                const suggestion = calculateSuggestedPrices({
                  costPrice,
                  currentPrice: price,
                  idealMarkupPercent: settings.idealMarkupPercent,
                  minimumMarkupPercent: settings.minimumMarkupPercent,
                });

                return (
                  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">Sugestao de preco</p>
                      <p className="text-muted-foreground text-xs">
                        Baseado no custo informado e nas margens globais
                        configuradas.
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-md border border-border/60 bg-background px-3 py-2">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
                          Preco minimo
                        </p>
                        <p className="font-medium text-sm">
                          {formatCurrency(suggestion.minimumPrice)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {settings.minimumMarkupPercent}% sobre o custo
                        </p>
                      </div>
                      <div className="rounded-md border border-border/60 bg-background px-3 py-2">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
                          Preco ideal
                        </p>
                        <p className="font-medium text-sm">
                          {formatCurrency(suggestion.idealPrice)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {settings.idealMarkupPercent}% sobre o custo
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() =>
                          form.setFieldValue("price", suggestion.minimumPrice)
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Usar minimo
                      </Button>
                      <Button
                        onClick={() =>
                          form.setFieldValue("price", suggestion.idealPrice)
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Usar ideal
                      </Button>
                    </div>

                    {suggestion.isBelowMinimum ? (
                      <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-xs">
                        O preco informado esta abaixo do minimo sugerido. O
                        salvamento continua permitido.
                      </div>
                    ) : null}
                  </div>
                );
              }}
            </form.Subscribe>

            <form.Field
              name="stock"
              validators={{
                onChange: ({ value }) => {
                  const result = productSchema.shape.stock.safeParse(value);
                  return result.success
                    ? undefined
                    : result.error.issues[0]?.message;
                },
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={field.name}>Estoque Inicial</Label>
                  <InputGroup>
                    <InputGroupInput
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(Number(event.target.value))
                      }
                      type="number"
                      value={field.state.value}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>unidades</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {field.state.meta.errors.length > 0 ? (
                    <em className="text-[11px] text-destructive">
                      {field.state.meta.errors.join(", ")}
                    </em>
                  ) : null}
                </div>
              )}
            </form.Field>
          </div>
          <DialogFooter>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button className="w-full" disabled={!canSubmit} type="submit">
                  {isSubmitting ? "Salvando..." : "Salvar Produto"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

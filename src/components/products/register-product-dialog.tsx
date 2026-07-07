"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useState } from "react";
import { ProductDatePicker } from "@/components/products/product-date-picker";
import { ProductImageInput } from "@/components/products/product-image-input";
import { uploadProductImageToStaging } from "@/components/products/product-image-upload";
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { OTHERS_CATEGORY_KEY } from "@/features/catalog/constants";
import { calculateSuggestedPrices } from "@/features/catalog/pricing";
import { createProductAction } from "@/features/products/actions";
import { createProductSchema as productSchema } from "@/features/products/schema";
import { formatDateInputValue } from "@/lib/domain/date";
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";

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
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [submitLabel, setSubmitLabel] = useState("Salvar Produto");
  const today = formatDateInputValue();
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
      purchasedOn: today,
      stock: 0,
    },
    onSubmit: async ({ value }) => {
      try {
        const stagedImage = selectedImage
          ? await (async () => {
              setSubmitLabel("Enviando imagem...");
              return await uploadProductImageToStaging(selectedImage);
            })()
          : undefined;

        setSubmitLabel("Salvando produto...");
        const productId = await createProductAction({
          name: value.name,
          description: value.description || undefined,
          categoryId: value.categoryId,
          costPrice: value.costPrice.toString(),
          price: value.price.toString(),
          purchasedOn: value.purchasedOn,
          stagedImage,
          stock: value.stock,
        });
        toast.success("Produto cadastrado.");
        setOpen(false);
        form.reset();
        setSelectedImage(null);
        router.push(`/produtos/${productId}`);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nao foi possivel cadastrar o produto."
        );
      } finally {
        setSubmitLabel("Salvar Produto");
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
      purchasedOn: today,
      stock: 0,
    });
    setSelectedImage(null);
    setSubmitLabel("Salvar Produto");
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
      <DialogContent
        className="sm:max-w-130"
        onInteractOutside={(e) => e.preventDefault()}
      >
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
          <FieldGroup className="py-6">
            <ProductImageInput
              description="Opcional. Aceita JPG, PNG ou WebP com ate 10 MB."
              id="register-product-image"
              label="Imagem do produto"
              onFileChange={setSelectedImage}
            />
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
                <Field
                  data-invalid={field.state.meta.errors.length > 0 || undefined}
                >
                  <FieldLabel htmlFor={field.name}>Nome do Produto</FieldLabel>
                  <Input
                    aria-invalid={
                      field.state.meta.errors.length > 0 ? "true" : undefined
                    }
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Ex: iPhone 16 Pro Max"
                    value={field.state.value}
                  />
                  <FieldError
                    errors={(field.state.meta.errors as string[]).map((m) => ({
                      message: m?.toString(),
                    }))}
                  />
                </Field>
              )}
            </form.Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <Field
                    data-invalid={
                      field.state.meta.errors.length > 0 || undefined
                    }
                  >
                    <FieldLabel htmlFor={field.name}>Categoria</FieldLabel>
                    <Select
                      onValueChange={field.handleChange}
                      value={field.state.value}
                    >
                      <SelectTrigger
                        aria-invalid={
                          field.state.meta.errors.length > 0
                            ? "true"
                            : undefined
                        }
                        className="w-full"
                        id={field.name}
                      >
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
                    <FieldError
                      errors={(field.state.meta.errors as string[]).map(
                        (m) => ({ message: m?.toString() })
                      )}
                    />
                  </Field>
                )}
              </form.Field>

              <form.Field
                name="purchasedOn"
                validators={{
                  onChange: ({ value }) => {
                    const result =
                      productSchema.shape.purchasedOn.safeParse(value);
                    return result.success
                      ? undefined
                      : result.error.issues[0]?.message;
                  },
                }}
              >
                {(field) => (
                  <Field
                    data-invalid={
                      field.state.meta.errors.length > 0 || undefined
                    }
                  >
                    <FieldLabel htmlFor={field.name}>Data da compra</FieldLabel>
                    <ProductDatePicker
                      aria-invalid={
                        field.state.meta.errors.length > 0 ? "true" : undefined
                      }
                      id={field.name}
                      onChange={field.handleChange}
                      value={field.state.value}
                    />
                    <FieldError
                      errors={(field.state.meta.errors as string[]).map(
                        (m) => ({ message: m?.toString() })
                      )}
                    />
                  </Field>
                )}
              </form.Field>
            </div>

            <form.Field name="description">
              {(field) => (
                <Field
                  data-invalid={field.state.meta.errors.length > 0 || undefined}
                >
                  <FieldLabel htmlFor={field.name}>Descricao</FieldLabel>
                  <InputGroup className="h-auto">
                    <InputGroupTextarea
                      aria-invalid={
                        field.state.meta.errors.length > 0 ? "true" : undefined
                      }
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
                  <FieldError
                    errors={(
                      field.state.meta.errors as unknown as string[]
                    ).map((m) => ({
                      message: m?.toString(),
                    }))}
                  />
                </Field>
              )}
            </form.Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <Field
                    data-invalid={
                      field.state.meta.errors.length > 0 || undefined
                    }
                  >
                    <FieldLabel htmlFor={field.name}>
                      Estoque Inicial
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        aria-invalid={
                          field.state.meta.errors.length > 0
                            ? "true"
                            : undefined
                        }
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(Number(event.target.value))
                        }
                        step="1"
                        type="number"
                        value={field.state.value}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupText>unidades</InputGroupText>
                      </InputGroupAddon>
                    </InputGroup>
                    <FieldError
                      errors={(field.state.meta.errors as string[]).map(
                        (m) => ({ message: m?.toString() })
                      )}
                    />
                  </Field>
                )}
              </form.Field>

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
                    field.handleChange(parseCurrencyInput(event.target.value));
                  };

                  return (
                    <Field
                      data-invalid={
                        field.state.meta.errors.length > 0 || undefined
                      }
                    >
                      <FieldLabel htmlFor={field.name}>
                        Custo Unitario
                      </FieldLabel>
                      <InputGroup>
                        <InputGroupAddon>
                          <InputGroupText>R$</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                          aria-invalid={
                            field.state.meta.errors.length > 0
                              ? "true"
                              : undefined
                          }
                          id={field.name}
                          inputMode="numeric"
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={handleChange}
                          placeholder="0,00"
                          type="text"
                          value={formatCurrencyInput(field.state.value)}
                        />
                      </InputGroup>
                      <FieldError
                        errors={(field.state.meta.errors as string[]).map(
                          (m) => ({ message: m?.toString() })
                        )}
                      />
                    </Field>
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
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
                      Guia de preco sugerido
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/10 px-3 py-1 text-left transition-colors hover:bg-muted/30 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                        onClick={() =>
                          form.setFieldValue("price", suggestion.minimumPrice)
                        }
                        type="button"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground uppercase leading-none tracking-wider">
                            Minimo
                          </span>
                          <span className="text-[9px] text-muted-foreground/50 tabular-nums">
                            {suggestion.minimumMarkupPercent}%
                          </span>
                        </div>
                        <span className="font-medium text-[13px] tabular-nums">
                          {formatCurrency(suggestion.minimumPrice)}
                        </span>
                      </button>
                      <button
                        className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/10 px-3 py-1 text-left transition-colors hover:bg-muted/30 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                        onClick={() =>
                          form.setFieldValue("price", suggestion.idealPrice)
                        }
                        type="button"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground uppercase leading-none tracking-wider">
                            Ideal
                          </span>
                          <span className="text-[9px] text-muted-foreground/50 tabular-nums">
                            {suggestion.idealMarkupPercent}%
                          </span>
                        </div>
                        <span className="font-medium text-[13px] tabular-nums">
                          {formatCurrency(suggestion.idealPrice)}
                        </span>
                      </button>
                    </div>

                    {suggestion.isBelowMinimum ? (
                      <p className="text-[11px] text-destructive">
                        Preco abaixo do minimo sugerido. O salvamento continua
                        permitido.
                      </p>
                    ) : null}
                  </div>
                );
              }}
            </form.Subscribe>

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
                const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
                  field.handleChange(parseCurrencyInput(event.target.value));
                };

                return (
                  <Field
                    data-invalid={
                      field.state.meta.errors.length > 0 || undefined
                    }
                  >
                    <FieldLabel htmlFor={field.name}>Preco de Venda</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <InputGroupText>R$</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        aria-invalid={
                          field.state.meta.errors.length > 0
                            ? "true"
                            : undefined
                        }
                        id={field.name}
                        inputMode="numeric"
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={handleChange}
                        placeholder="0,00"
                        type="text"
                        value={formatCurrencyInput(field.state.value)}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupText
                          className={cn(
                            "font-medium text-[10px] opacity-70",
                            field.state.value > 0 &&
                              (form.state.values.costPrice > 0 &&
                              field.state.value <
                                form.state.values.costPrice *
                                  (1 + settings.minimumMarkupPercent / 100)
                                ? "text-destructive"
                                : "text-emerald-500")
                          )}
                        >
                          {(
                            (field.state.value > 0 &&
                            form.state.values.costPrice > 0
                              ? field.state.value /
                                  form.state.values.costPrice -
                                1
                              : 0) * 100
                          ).toFixed(1)}
                          %
                        </InputGroupText>
                      </InputGroupAddon>
                    </InputGroup>
                    <FieldError
                      errors={(field.state.meta.errors as string[]).map(
                        (m) => ({ message: m?.toString() })
                      )}
                    />
                  </Field>
                );
              }}
            </form.Field>
          </FieldGroup>
          <DialogFooter>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button className="w-full" disabled={!canSubmit} type="submit">
                  {isSubmitting ? submitLabel : "Salvar Produto"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

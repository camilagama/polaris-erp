"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
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

const productSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional().default(""),
  costPrice: z
    .string()
    .min(1, "Obrigatório")
    .regex(/^\d+([.,]\d{1,2})?$/, "Formato inválido"),
  price: z
    .string()
    .min(1, "Obrigatório")
    .regex(/^\d+([.,]\d{1,2})?$/, "Formato inválido"),
  stock: z.number().min(0, "Mínimo 0"),
});

export function RegisterProductDialog() {
  const [open, setOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      costPrice: "",
      price: "",
      stock: 0,
    },
    onSubmit: async ({ value }) => {
      await createProductAction({
        name: value.name,
        description: value.description || undefined,
        costPrice: value.costPrice.replace(",", "."),
        price: value.price.replace(",", "."),
        stock: value.stock.toString(),
      });
      setOpen(false);
      form.reset();
    },
  });

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button>Cadastrar Produto</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Novo Produto</DialogTitle>
          <DialogDescription>
            Adicione um novo produto e registre sua entrada inicial no estoque.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="flex flex-col gap-4 py-4">
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) => {
                  const res = productSchema.shape.name.safeParse(value);
                  return res.success ? undefined : res.error.issues[0].message;
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
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Ex: iPhone 16 Pro Max"
                    value={field.state.value}
                  />
                  {field.state.meta.errors &&
                  field.state.meta.errors.length > 0 ? (
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
                  <Label htmlFor={field.name}>Descrição</Label>
                  <InputGroup className="h-auto">
                    <InputGroupTextarea
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Detalhes sobre versão, cor, etc..."
                      value={field.state.value}
                    />
                  </InputGroup>
                </div>
              )}
            </form.Field>

            <div className="grid grid-cols-2 gap-4">
              <form.Field
                name="costPrice"
                validators={{
                  onChange: ({ value }) => {
                    const res = productSchema.shape.costPrice.safeParse(value);
                    return res.success
                      ? undefined
                      : res.error.issues[0].message;
                  },
                }}
              >
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={field.name}>Custo Unitário</Label>
                    <InputGroup>
                      <InputGroupAddon>
                        <InputGroupText>R$</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="0,00"
                        value={field.state.value}
                      />
                    </InputGroup>
                    {field.state.meta.errors &&
                    field.state.meta.errors.length > 0 ? (
                      <em className="text-[11px] text-destructive">
                        {field.state.meta.errors.join(", ")}
                      </em>
                    ) : null}
                  </div>
                )}
              </form.Field>

              <form.Field
                name="price"
                validators={{
                  onChange: ({ value }) => {
                    const res = productSchema.shape.price.safeParse(value);
                    return res.success
                      ? undefined
                      : res.error.issues[0].message;
                  },
                }}
              >
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={field.name}>Preço de Venda</Label>
                    <InputGroup>
                      <InputGroupAddon>
                        <InputGroupText>R$</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="0,00"
                        value={field.state.value}
                      />
                    </InputGroup>
                    {field.state.meta.errors &&
                    field.state.meta.errors.length > 0 ? (
                      <em className="text-[11px] text-destructive">
                        {field.state.meta.errors.join(", ")}
                      </em>
                    ) : null}
                  </div>
                )}
              </form.Field>
            </div>

            <form.Field
              name="stock"
              validators={{
                onChange: ({ value }) => {
                  const res = productSchema.shape.stock.safeParse(value);
                  return res.success ? undefined : res.error.issues[0].message;
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
                      onChange={(e) =>
                        field.handleChange(Number(e.target.value))
                      }
                      type="number"
                      value={field.state.value}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>unidades</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {field.state.meta.errors &&
                  field.state.meta.errors.length > 0 ? (
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

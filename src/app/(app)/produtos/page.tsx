import { RegisterProductDialog } from "@/components/products/register-product-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getCatalogSettings,
  listCategoriesWithUsage,
} from "@/features/catalog/server";
import { getProductsAction } from "./actions";

function formatCurrency(value: string | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0);
}

export default async function ProdutosPage() {
  const [products, categories, settings] = await Promise.all([
    getProductsAction(),
    listCategoriesWithUsage(),
    getCatalogSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6 p-4 pb-20 sm:p-6 sm:pb-6">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-2xl tracking-tight">Produtos</h1>
        <RegisterProductDialog
          categories={categories.map((category) => ({
            id: category.id,
            key: category.key,
            name: category.name,
          }))}
          settings={settings}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
          <CardDescription>
            Visualize e gerencie todos os produtos cadastrados no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4 sm:pl-6">Nome</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead className="pr-4 text-right sm:pr-6">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell className="h-24 text-center" colSpan={4}>
                      Nenhum produto encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="pl-4 font-medium sm:pl-6">
                        <div className="flex flex-col">
                          <span>{product.name}</span>
                          {product.description && (
                            <span className="font-normal text-muted-foreground text-xs">
                              {product.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(product.price)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            Number(product.stock) > 0
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {product.stock} em estoque
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-4 text-right sm:pr-6">
                        <Button size="sm" variant="ghost">
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

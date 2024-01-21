import { KeyboardEvent, useState } from "react";
import { Button } from "./components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table";
import { LogOut, MoveRight, PlusIcon } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Input } from "./components/ui/input";
import { useToast } from "./components/ui/use-toast";
import axios, { AxiosResponse } from "axios";

type Sale = {
  id: string;
  casherId: string;
  items: SaleItem[];
};

type SaleItem = {
  id?: string;
  name?: string;
  stock?: number;
  productId?: string;
  quantity?: number;
  discountId?: string;
  unitPrice?: number;
};

type Product = {
  id: string;
  name: string;
  availableStock: number;
  unitPrice: number;
  categoryId: string;
};

export default function App() {
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [hasTempSales, setHasTempSales] = useState(false);
  const { toast } = useToast();
  const [productCode, setProductCode] = useState("");
  const [isGettingProduct, setIsGettingProduct] = useState(false);
  const [quantity, setQuantity] = useState<number>();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handlePressAdd = () => {
    if (hasTempSales) {
      toast({
        title: "Warning",
        description: "Please confirm one order item before adding new one!",
        variant: "destructive",
      });
      return;
    }
    setSaleItems((prev) => {
      return [
        {
          id: undefined,
          productId: undefined,
          quantity: undefined,
          discountId: undefined,
        },
        ...prev,
      ];
    });
    setHasTempSales(true);
  };

  const fetchProduct = async () => {
    try {
      setIsGettingProduct(true);
      const response: AxiosResponse<Product> = await axios.get(
        `/products/${productCode}`
      );
      const product = response.data;
      setIsGettingProduct(false);
      if (product.availableStock <= 0) {
        toast({
          title: "Warning",
          description: `Insufficient stock!`,
          variant: "destructive",
        });
      }
      setSaleItems((prev) => {
        return prev.map((item, index) => {
          if (index === 0) {
            return {
              ...item,
              name: product.name,
              discountId: "Not yet",
              quantity: 0,
              stock: product.availableStock,
              productId: product.id,
              unitPrice: product.unitPrice,
            };
          }
          return item;
        });
      });
    } catch (e) {
      setIsGettingProduct(false);
      setSaleItems((prev) => {
        const temp = [...prev];
        temp[0] = {
          id: undefined,
          productId: undefined,
          quantity: undefined,
          discountId: undefined,
        };
        return temp;
      });
      console.log("Error at fetchProduct ", e);
      toast({
        title: "Error",
        description: `There is no product with '${productCode}' product code!`,
      });
    }
  };

  const handleKeydown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.code != "Enter") return;
    fetchProduct();
  };

  const handleConfirm = () => {
    const saleItem = saleItems[0];
    if (!saleItem.productId) {
      toast({
        title: "Error",
        description: "Invalid product!",
        variant: "destructive",
      });
      return;
    }

    if (
      quantity == undefined ||
      quantity < 1 ||
      saleItem.stock == undefined ||
      quantity > saleItem.stock
    ) {
      toast({
        title: "Error",
        description: "Invalid quantity to process!",
        variant: "destructive",
      });
      return;
    }
    saleItem.quantity = quantity;
    saleItem.id = uuidv4();
    console.log(saleItem);
    setSaleItems((prev) => {
      return prev.map((_, index) => {
        if (index == 0) return saleItem;
        return _;
      });
    });
    setHasTempSales(false);
    setProductCode("");
    setQuantity(undefined);
  };

  const handleCancel = (target: number) => {
    setSaleItems((prev) => {
      return prev.filter((_, index) => target != index);
    });
  };

  const handleCheckout = async () => {
    if (saleItems.length == 0) {
      return toast({
        title: "Warning",
        description: "Unable to process !",
      });
    }
    try {
      setIsCheckingOut(true);
      await axios.post("/sales", {
        casherId: 1,
        id: uuidv4(),
        items: saleItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      });
      setIsCheckingOut(false);
      toast({
        title: "Success",
        description: "Successfully checked out!",
      });
      setSaleItems([]);
    } catch (e) {
      setIsCheckingOut(false);
      console.log("Error ", e);
      toast({
        title: "Error",
        description: "Something went wrong in processing checkout!",
      });
    }
  };

  return (
    <div className="container min-w-screen min-h-screen py-5 px-10">
      <div className="flex justify-end">
        <Button onClick={handlePressAdd}>
          <PlusIcon />
          Add Item
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product Code</TableHead>
            <TableHead>Product Name</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Unit Price(MMK)</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Discount</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {saleItems.length === 0 && (
            <TableRow>
              <TableCell className="text-center" colSpan={6}>
                Not yet sales!
              </TableCell>
            </TableRow>
          )}
          {saleItems.length > 0 &&
            saleItems.map((item, index) => {
              return (
                <TableRow key={item.id || index}>
                  <TableCell>
                    {!item.id && (
                      <Input
                        value={productCode}
                        onChange={(e) => setProductCode(e.target.value)}
                        placeholder={"Product Code"}
                        autoFocus
                        readOnly={isGettingProduct}
                        onKeyDown={handleKeydown}
                      />
                    )}
                    {item.id && <h6>{item.productId}</h6>}
                  </TableCell>
                  <TableCell>
                    {isGettingProduct ? (
                      <h6 className="text-zinc-600">Loading...</h6>
                    ) : (
                      <h6>{item.name || "-"}</h6>
                    )}
                  </TableCell>
                  <TableCell>
                    {!isGettingProduct &&
                      item.productId &&
                      item.stock != undefined &&
                      item.stock > 0 &&
                      !item.id && (
                        <Input
                          placeholder={"Quantity"}
                          type="number"
                          min={1}
                          max={item.stock}
                          autoFocus
                          defaultValue={quantity}
                          onChange={(e) => {
                            setQuantity(Number(e.target.value));
                          }}
                        />
                      )}
                    {!isGettingProduct && !item.productId && (
                      <h6>Please add product code first!</h6>
                    )}
                    {!isGettingProduct &&
                      item.productId &&
                      item.stock != undefined &&
                      item.stock <= 0 && (
                        <h6 className="text-red-500"> Unable to add!</h6>
                      )}
                    {item.id && <h6>{item.quantity}</h6>}
                  </TableCell>
                  <TableCell>
                    {isGettingProduct ? (
                      <h6 className="text-zinc-600">Loading...</h6>
                    ) : (
                      <h6>{item.unitPrice || "-"}</h6>
                    )}
                  </TableCell>
                  <TableCell>
                    {isGettingProduct ? (
                      <h6 className="text-zinc-600">Loading...</h6>
                    ) : (
                      <h6
                        className={
                          item.stock != undefined && item.stock <= 0
                            ? "text-red-500"
                            : "text-green-500"
                        }
                      >
                        {item.stock == undefined ? "-" : item.stock}
                      </h6>
                    )}
                  </TableCell>
                  <TableCell>
                    <h6 className="text-red-500">Not yet</h6>
                  </TableCell>
                  <TableCell>
                    {!item.id && (
                      <Button onClick={handleConfirm}>Confirm</Button>
                    )}
                    {item.id && (
                      <Button
                        onClick={() => handleCancel(index)}
                        variant={"destructive"}
                      >
                        Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
      <div className="flex justify-end mt-5">
        <div className="flex gap-10 items-center">
          <h6 className="text-end">
            Total amount :{" "}
            {saleItems.reduce((acc, cur) => {
              const quantity = cur.quantity == undefined ? 0 : cur.quantity;
              const unitPrice = cur.unitPrice == undefined ? 0 : cur.unitPrice;
              return acc + quantity * unitPrice;
            }, 0)}{" "}
            MMK
          </h6>
          <Button disabled={isCheckingOut} onClick={handleCheckout}>
            <LogOut /> {isCheckingOut ? "Loading" : "Check out"}
          </Button>
        </div>
      </div>
    </div>
  );
}

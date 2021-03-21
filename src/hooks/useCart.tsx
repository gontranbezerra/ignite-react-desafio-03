import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const selectedProduct = cart.find((product) => product.id === productId);
      const stock: Stock = await api.get(`stock/${productId}`).then((response) => response.data);

      if (stock.amount < 1) {
        toast.error('Produto sem estoque');
        return;
      }

      if (selectedProduct) {
        const total = selectedProduct.amount + 1;

        if (total > stock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const newCart = cart.map((item) => {
          if (item.id === productId) {
            return { ...item, amount: total };
          } else {
            return item;
          }
        });

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

        setCart(newCart);

        return;
      }

      const product: Product = await api
        .get(`products/${productId}`)
        .then((response) => response.data);

      setCart((cart) => {
        const newCart = [...cart, { ...product, amount: 1 }];

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

        return newCart;
      });
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const selectedProduct = cart.find((product) => product.id === productId);

      if (!selectedProduct) {
        throw new Error();
      }

      setCart((cart) => {
        const newCart = cart.filter((product) => product.id !== productId);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

        return newCart;
      });
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({ productId, amount }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const selectedProduct = cart.find((product) => product.id === productId);

      if (!selectedProduct) {
        throw new Error();
      }

      const stock: Stock = await api.get(`stock/${productId}`).then((response) => response.data);

      if (stock.amount < 1) {
        toast.error('Produto sem estoque');
        return;
      }

      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      setCart((cart) => {
        const newCart = cart.map((product) => {
          if (product.id === productId) {
            product.amount = amount;
          }
          return product;
        });

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

        return newCart;
      });
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider value={{ cart, addProduct, removeProduct, updateProductAmount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}

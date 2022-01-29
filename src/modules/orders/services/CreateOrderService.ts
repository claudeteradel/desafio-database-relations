import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customerExists = await this.customersRepository.findById(customer_id);

    if (!customerExists) {
      throw new AppError('None customer found with the given id');
    }

    const existentProducts = await this.productsRepository.findAllById(products);

    const existentProductsIds = existentProducts.map(product => product.id);

    const checkInexistentProducts = products.filter(
      product => !existentProductsIds.includes(product.id)
    )

    if (checkInexistentProducts.length) {
      checkInexistentProducts.map(product => {
         throw new AppError(`The product ID ${product.id} do not exist`)}
      )
    }

    const findProductsWithUnavailableQuantity = products.filter(
      product => existentProducts.find(p => p.id === product.id)!.quantity < product.quantity
    );

    console.log(findProductsWithUnavailableQuantity);

    if (findProductsWithUnavailableQuantity.length) {
      findProductsWithUnavailableQuantity.map(product => {
        throw new AppError(`The quantity ${product.quantity} is not available for ${product.id}`)}
      )
    }

    const formatedProducts = products.map(product => ({
      product_id: product.id,
      quantity: product.quantity,
      price: existentProducts.find(p => p.id == product.id)!.price,
    }));

    const formatedOrder = await this.ordersRepository.create({
      customer: customerExists,
      products: formatedProducts
    });

    const orderedProductsQuantity = products.map(product => ({
      id: product.id,
      quantity: existentProducts.find(p => p.id === product.id)!.quantity - product.quantity
    }));

    await this.productsRepository.updateQuantity(orderedProductsQuantity);

    return formatedOrder;
  }
}

export default CreateOrderService;

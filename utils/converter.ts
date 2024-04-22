import { EncodedOrder } from "@bancor/carbon-sdk";
import { OrderStruct } from "@bancor/carbon-sdk/dist/abis/types/CarbonController";
import { BigNumber } from "@bancor/carbon-sdk/utils";
import { ConvertedStrategy } from "./types";

type ToBigInt<T> = T extends BigNumber ? BigInt : T;
type BigIntRecord<T extends object> = {
  [key in keyof T]: ToBigInt<T[key]>;
}

export function toBigInt<T extends object>(arg: T) {
  const res: Partial<BigIntRecord<T>> = {};
  for (const [key, value] of Object.entries(arg)) {
    if (value instanceof BigNumber) {
      (res as any)[key] = value.toBigInt();
    } else if (typeof value === 'object' && !!value) {
      (res as any)[key] = toBigInt(value);
    } else {
      res[key as keyof T] = value;
    }
  };
  return res;
};

export function convertOrder(orders: EncodedOrder[]): OrderStruct[] {
  const res: OrderStruct[] = [];
  for (const order of orders) {
    res.push(toBigInt<EncodedOrder>(order) as OrderStruct);
  };
  return res;
}
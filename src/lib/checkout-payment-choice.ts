export const CHECKOUT_PAYMENT_CHOICES = [
  "BANK_WIRE",
  "CASH_ON_DELIVERY",
  "STRIPE",
  "IYZICO",
  "PAYTR",
] as const;

export type CheckoutPaymentChoice = (typeof CHECKOUT_PAYMENT_CHOICES)[number];

export const ORDER_PAYMENT_PROVIDERS = ["stripe", "iyzico", "paytr"] as const;
export type OrderPaymentProvider = (typeof ORDER_PAYMENT_PROVIDERS)[number];

export type CheckoutCardOption = {
  id: "STRIPE" | "IYZICO" | "PAYTR";
  title: string;
  hint: string;
};

export function parseCheckoutPaymentChoice(value: string): CheckoutPaymentChoice {
  switch (value) {
    case "BANK_WIRE":
    case "CASH_ON_DELIVERY":
    case "STRIPE":
    case "IYZICO":
    case "PAYTR":
      return value;
    case "CREDIT_CARD":
      return "STRIPE";
    default:
      return "BANK_WIRE";
  }
}

export function checkoutChoiceToOrderPayment(choice: CheckoutPaymentChoice): {
  method: "BANK_WIRE" | "CASH_ON_DELIVERY" | "CREDIT_CARD";
  provider: OrderPaymentProvider | null;
} {
  switch (choice) {
    case "BANK_WIRE":
      return { method: "BANK_WIRE", provider: null };
    case "CASH_ON_DELIVERY":
      return { method: "CASH_ON_DELIVERY", provider: null };
    case "STRIPE":
      return { method: "CREDIT_CARD", provider: "stripe" };
    case "IYZICO":
      return { method: "CREDIT_CARD", provider: "iyzico" };
    case "PAYTR":
      return { method: "CREDIT_CARD", provider: "paytr" };
    default: {
      const _exhaustive: never = choice;
      return _exhaustive;
    }
  }
}

export function parseOrderPaymentProvider(value: string | null | undefined): OrderPaymentProvider | null {
  switch (value) {
    case "stripe":
    case "iyzico":
    case "paytr":
      return value;
    default:
      return null;
  }
}

export function orderPaymentProviderLabel(provider: OrderPaymentProvider): string {
  switch (provider) {
    case "stripe":
      return "Stripe";
    case "iyzico":
      return "iyzico";
    case "paytr":
      return "PayTR";
    default: {
      const _exhaustive: never = provider;
      return _exhaustive;
    }
  }
}

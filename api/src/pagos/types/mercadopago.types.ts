/**
 * Interfaces para respuestas de MercadoPago API
 */

export interface MercadoPagoCard {
  id?: string;
  first_six_digits?: string;
  last_four_digits?: string;
  expiration_month?: number;
  expiration_year?: number;
  date_created?: string;
  date_last_updated?: string;
  cardholder?: {
    name?: string;
    identification?: {
      number?: string;
      type?: string;
    };
  };
}

export interface MercadoPagoPayer {
  id?: string;
  email?: string;
  identification?: {
    number?: string;
    type?: string;
  };
  phone?: {
    area_code?: string;
    number?: string;
  };
  first_name?: string;
  last_name?: string;
  entity_type?: string;
}

export interface MercadoPagoPaymentResponse {
  id?: number;
  date_created?: string;
  date_approved?: string;
  date_last_updated?: string;
  date_of_expiration?: string;
  money_release_date?: string;
  operation_type?: string;
  issuer_id?: string;
  payment_method_id?: string;
  payment_type_id?: string;
  status?: string;
  status_detail?: string;
  currency_id?: string;
  description?: string;
  live_mode?: boolean;
  sponsor_id?: string;
  authorization_code?: string;
  money_release_schema?: string;
  taxes_amount?: number;
  counter_currency?: string;
  brand_id?: string;
  shipping_amount?: number;
  pos_id?: string;
  store_id?: string;
  integrator_id?: string;
  platform_id?: string;
  corporation_id?: string;
  collector_id?: number;
  payer?: MercadoPagoPayer;
  marketplace_owner?: string;
  metadata?: Record<string, unknown>;
  additional_info?: {
    authentication_code?: string;
    available_balance?: string;
    nsu_processadora?: string;
  };
  order?: {
    type?: string;
    id?: string;
  };
  external_reference?: string;
  transaction_amount?: number;
  transaction_amount_refunded?: number;
  coupon_amount?: number;
  differential_pricing_id?: string;
  deduction_schema?: string;
  transaction_details?: {
    payment_method_reference_id?: string;
    net_received_amount?: number;
    total_paid_amount?: number;
    overpaid_amount?: number;
    external_resource_url?: string;
    installment_amount?: number;
    financial_institution?: string;
    payable_deferral_period?: string;
    acquirer_reference?: string;
  };
  fee_details?: Array<{
    type?: string;
    amount?: number;
    fee_payer?: string;
  }>;
  charges_details?: Array<{
    id?: string;
    name?: string;
    type?: string;
    accounts?: {
      from?: string;
      to?: string;
    };
    client_id?: string;
    date_created?: string;
    last_updated?: string;
    amounts?: {
      original?: number;
      refunded?: number;
    };
    metadata?: Record<string, unknown>;
    reserve_id?: string;
    refund_charges?: Array<unknown>;
  }>;
  captured?: boolean;
  binary_mode?: boolean;
  call_for_authorize_id?: string;
  statement_descriptor?: string;
  installments?: number;
  card?: MercadoPagoCard;
  notification_url?: string;
  refunds?: Array<{
    id?: number;
    payment_id?: number;
    amount?: number;
    metadata?: Record<string, unknown>;
    source?: {
      id?: string;
      name?: string;
      type?: string;
    };
    date_created?: string;
    unique_sequence_number?: string;
  }>;
  processing_mode?: string;
  merchant_account_id?: string;
  merchant_number?: string;
  acquirer_reconciliation?: Array<unknown>;
  point_of_interaction?: {
    type?: string;
    business_info?: {
      unit?: string;
      sub_unit?: string;
    };
  };
}

export interface MercadoPagoTokenResponse {
  id?: string;
  public_key?: string;
  card_id?: string;
  status?: string;
  date_created?: string;
  date_last_updated?: string;
  date_due?: string;
  luhn_validation?: boolean;
  live_mode?: boolean;
  require_esc?: boolean;
  card_number_length?: number;
  security_code_length?: number;
  first_six_digits?: string;
  last_four_digits?: string;
  cardholder?: {
    identification?: {
      number?: string;
      type?: string;
    };
    name?: string;
  };
}

export interface MercadoPagoErrorResponse {
  message?: string;
  error?: string;
  status?: number;
  cause?: Array<{
    code?: string;
    description?: string;
    data?: string;
  }>;
}

/**
 * Payload para crear un pago en MercadoPago
 */
export interface MercadoPagoPaymentRequest {
  transaction_amount: number;
  token?: string;
  description: string;
  installments: number;
  payment_method_id: string;
  payer: {
    email: string;
    identification?: {
      type: string;
      number: string;
    };
  };
  external_reference?: string;
  notification_url?: string;
  statement_descriptor?: string;
  binary_mode?: boolean;
  capture?: boolean;
  metadata?: Record<string, unknown>;
  additional_info?: {
    items?: Array<{
      id?: string;
      title?: string;
      description?: string;
      picture_url?: string;
      category_id?: string;
      quantity?: number;
      unit_price?: number;
    }>;
    payer?: {
      first_name?: string;
      last_name?: string;
      phone?: {
        area_code?: string;
        number?: string;
      };
      address?: {
        street_name?: string;
        street_number?: number;
        zip_code?: string;
      };
      registration_date?: string;
    };
    shipments?: {
      receiver_address?: {
        zip_code?: string;
        state_name?: string;
        city_name?: string;
        street_name?: string;
        street_number?: number;
      };
    };
  };
}

/**
 * Payload para crear un token de tarjeta
 */
export interface MercadoPagoCardTokenRequest {
  card_number: string;
  expiration_month: number;
  expiration_year: number;
  security_code: string;
  cardholder: {
    name: string;
    identification: {
      type: string;
      number: string;
    };
  };
}

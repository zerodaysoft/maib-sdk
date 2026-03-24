// ---------------------------------------------------------------------------
// @maib/core — shared infrastructure
// ---------------------------------------------------------------------------

export type {
  MaibApiError,
  MaibClientConfig,
  MaibErrorResponse,
  MaibResponse,
  MaibSuccessResponse,
  PaginatedResult,
  PaginationParams,
  TokenResult,
} from "@maib/core";
export {
  BaseClient,
  computeHmacSignature,
  computeSignature,
  DEFAULT_API_HOST,
  Environment,
  Language,
  MaibError,
  MaibNetworkError,
  PRODUCTION_API_HOST,
  SANDBOX_API_HOST,
  SDK_VERSION,
  TOKEN_REFRESH_BUFFER_S,
  verifyHmacSignature,
  verifySignature,
} from "@maib/core";

// ---------------------------------------------------------------------------
// @maib/checkout — hosted checkout API
// ---------------------------------------------------------------------------

// Re-export colliding names with checkout-specific aliases
export type {
  CancelSessionResult,
  CheckoutCallbackPayload,
  CheckoutClientConfig,
  CreateSessionRequest,
  CreateSessionResult,
  ListPaymentsParams as CheckoutListPaymentsParams,
  ListSessionsParams,
  OrderInfo,
  OrderItem,
  PayerInfo,
  PaymentDetails as CheckoutPaymentDetails,
  RefundDetails as CheckoutRefundDetails,
  RefundRequest as CheckoutRefundRequest,
  RefundResult as CheckoutRefundResult,
  SessionDetails,
  SessionOrder,
  SessionOrderItem,
  SessionPayer,
  SessionPayment,
} from "@maib/checkout";
export { CheckoutClient, CheckoutStatus, PaymentStatus, RefundStatus } from "@maib/checkout";

// ---------------------------------------------------------------------------
// @maib/ecommerce — e-commerce payment gateway
// ---------------------------------------------------------------------------

// Re-export colliding names with ecommerce-specific aliases
export type {
  BasePaymentParams,
  CallbackPayload,
  CallbackResult,
  CompleteRequest,
  CompleteResult,
  CustomerFacingParams,
  EcommerceClientConfig,
  ExecuteOneclickRequest,
  ExecuteRecurringRequest,
  ExecuteRecurringResult,
  HoldRequest,
  PayInfoResult,
  PaymentInitResult,
  PaymentItem,
  PayRequest,
  RefundRequest as EcommerceRefundRequest,
  RefundResult as EcommerceRefundResult,
  SavecardOneclickRequest,
  SavecardRecurringRequest,
} from "@maib/ecommerce";
export { Currency, EcommerceClient, ThreeDsStatus, TransactionStatus } from "@maib/ecommerce";

// ---------------------------------------------------------------------------
// @maib/rtp — request to pay
// ---------------------------------------------------------------------------

export type {
  CancelRtpRequest,
  CancelRtpResult,
  CreateRtpRequest,
  CreateRtpResult,
  ListRtpParams,
  RefundRtpRequest,
  RefundRtpResult,
  RtpCallbackPayload,
  RtpCallbackResult,
  RtpClientConfig,
  RtpStatusResult,
  TestAcceptRequest,
  TestAcceptResult,
  TestRejectResult,
} from "@maib/rtp";
export { RtpClient, RtpStatus } from "@maib/rtp";

// ---------------------------------------------------------------------------
// @maib/mia — MIA QR payments
// ---------------------------------------------------------------------------

// Re-export colliding names with mia-specific aliases
export type {
  CancelExtensionRequest,
  CancelExtensionResult,
  CancelQrRequest,
  CancelQrResult,
  CreateExtensionRequest,
  CreateExtensionResult,
  CreateHybridQrRequest,
  CreateHybridQrResult,
  CreateQrRequest,
  CreateQrResult,
  HybridExtension,
  ListExtensionsParams,
  ListPaymentsParams as MiaListPaymentsParams,
  ListQrParams,
  MiaCallbackPayload,
  MiaCallbackResult,
  MiaClientConfig,
  MiaPaymentDetails,
  MiaRefundResult,
  QrDetails,
  RefundPaymentRequest,
  TestPayRequest,
  TestPayResult,
} from "@maib/mia";
export { AmountType, MiaClient, MiaPaymentStatus, QrStatus, QrType } from "@maib/mia";

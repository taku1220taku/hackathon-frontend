export type User = {
  id: number;
  email: string;
  displayName: string;
  avatarUrl: string;
  role: "user" | "admin";
  rating: number;
};

export type Item = {
  id: number;
  sellerId: number;
  title: string;
  description: string;
  price: number;
  shippingFee: number;
  categoryId: number;
  category: string;
  status: "draft" | "published" | "sold";
  conditionScore: number;
  context: string;
  images: string[];
  sellerCanDelete: boolean;
  likeCount: number;
  likedByMe: boolean;
  viewCount: number;
  recentViewCount: number;
  viewVelocity: number;
};

export type Transaction = {
  id: number;
  itemId: number;
  buyerId: number;
  sellerId: number;
  status: "pending" | "active" | "done";
  myReviewed: boolean;
  partnerReviewed: boolean;
  item?: Item;
};

export type Message = {
  id: number;
  transactionId: number;
  senderId: number;
  body: string;
  sentAt: string;
};

export type Review = {
  id: number;
  transactionId: number;
  reviewerId: number;
  revieweeId: number;
  rating: number;
  comment: string;
  reviewerName?: string;
  reviewerRole?: string;
  revieweeName?: string;
  revieweeRole?: string;
};

export type AssistResult = {
  title: string;
  description: string;
  categoryId: number;
  category: string;
  conditionScore: number;
  conditionNotes: string;
  suggestedTags: string[];
  suggestedPrice: number;
  sellThroughDays: number;
};

export type PriceSuggestion = {
  suggestedPrice: number;
  marketRange: [number, number];
  sellThroughDays: number;
};

export type ItemMetrics = {
  viewCount: number;
  recentViewCount: number;
  viewVelocity: number;
  likeCount: number;
};

export type DynamicPricePoint = {
  day: number;
  price: number;
  sellProbability: number;
};

export type DynamicPriceResult = {
  recommendedPrice: number;
  expectedSellDays: number;
  pricePath: DynamicPricePoint[];
  marketRange: [number, number];
  confidence: number;
  explanation: string;
};

export type FraudCheckResult = {
  risk: "low" | "watch" | "high";
  reasons: string[];
};

export type ItemQuestionResult = {
  answer: string;
};

export type DraftItem = {
  title: string;
  description: string;
  categoryId: number;
  category: string;
  price: number | "";
  shippingFee: number;
  conditionScore: number | "";
  imageUrls: string[];
  imageNames: string[];
  memo: string;
};

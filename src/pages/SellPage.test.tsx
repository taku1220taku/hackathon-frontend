// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { api } from "../lib/api";
import type { DynamicPriceResult, Item, PriceSuggestion } from "../lib/types";
import { SellPage } from "./SellPage";

vi.mock("../lib/api", () => ({
  api: vi.fn(),
  uploadImage: vi.fn(),
}));

vi.mock("../lib/auth", () => ({
  useAuth: () => ({
    token: "test-token",
    user: {
      id: 1,
      email: "seller@example.test",
      displayName: "Seller",
      avatarUrl: "",
      role: "user",
      rating: 5,
    },
  }),
}));

const mockedApi = vi.mocked(api);

function renderSellPage() {
  render(
    <MemoryRouter initialEntries={["/sell"]}>
      <Routes>
        <Route path="/sell" element={<SellPage />} />
        <Route path="/items/:id/edit" element={<div>商品編集へ遷移しました</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockedApi.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("SellPage", () => {
  it("saves an incomplete draft and moves to its edit route", async () => {
    const created: Item = {
      id: 42,
      sellerId: 1,
      title: "",
      description: "",
      price: 0,
      shippingFee: 700,
      categoryId: 801,
      category: "その他 / その他",
      status: "draft",
      conditionScore: 0,
      context: "",
      images: [],
      sellerCanDelete: true,
      likeCount: 0,
      likedByMe: false,
      viewCount: 0,
      recentViewCount: 0,
      viewVelocity: 0,
    };
    mockedApi.mockResolvedValueOnce(created);
    renderSellPage();

    fireEvent.click(screen.getByRole("button", { name: "下書きを保存" }));

    await screen.findByText("商品編集へ遷移しました");
    expect(mockedApi).toHaveBeenCalledWith("/items", expect.objectContaining({
      method: "POST",
      token: "test-token",
      body: expect.objectContaining({
        title: "",
        description: "",
        price: 0,
        conditionScore: 0,
        status: "draft",
        images: [],
      }),
    }));
  });

  it("passes the AI market range into dynamic pricing", async () => {
    const suggestion: PriceSuggestion = {
      suggestedPrice: 6800,
      marketRange: [6000, 8000],
      sellThroughDays: 7,
    };
    const dynamic: DynamicPriceResult = {
      recommendedPrice: 6800,
      expectedSellDays: 7,
      pricePath: [{ day: 1, price: 6800, sellProbability: 10 }],
      marketRange: [6000, 8000],
      confidence: 0.45,
      explanation: "test",
    };
    mockedApi.mockImplementation(async (path) => {
      if (path === "/ai/price-suggest") return suggestion as never;
      if (path === "/ai/dynamic-price") return dynamic as never;
      throw new Error(`unexpected API call: ${path}`);
    });
    renderSellPage();

    fireEvent.click(screen.getByRole("button", { name: "価格提案" }));
    await screen.findByText("推奨 ¥6,800");
    fireEvent.click(screen.getByRole("button", { name: "動的価格" }));
    await screen.findByText("初期推奨 ¥6,800");

    await waitFor(() => {
      const dynamicCall = mockedApi.mock.calls.find(([path]) => path === "/ai/dynamic-price");
      expect(dynamicCall?.[1]).toEqual(expect.objectContaining({
        body: expect.objectContaining({
          currentPrice: 6800,
          marketRange: [6000, 8000],
        }),
      }));
    });
  });
});

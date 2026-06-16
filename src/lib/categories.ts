export type CategoryOption = {
  id: number;
  label: string;
};

export const categoryOptions: CategoryOption[] = [
  { id: 101, label: "レディース / トップス" },
  { id: 102, label: "レディース / ジャケット/アウター" },
  { id: 103, label: "レディース / バッグ" },
  { id: 104, label: "レディース / 靴" },
  { id: 201, label: "メンズ / トップス" },
  { id: 202, label: "メンズ / ジャケット/アウター" },
  { id: 203, label: "メンズ / バッグ" },
  { id: 204, label: "メンズ / 靴" },
  { id: 301, label: "家電・スマホ・カメラ / スマートフォン/携帯電話" },
  { id: 302, label: "家電・スマホ・カメラ / PC/タブレット" },
  { id: 303, label: "家電・スマホ・カメラ / カメラ" },
  { id: 304, label: "家電・スマホ・カメラ / オーディオ機器" },
  { id: 401, label: "本・音楽・ゲーム / 本" },
  { id: 402, label: "本・音楽・ゲーム / 漫画" },
  { id: 403, label: "本・音楽・ゲーム / CD/DVD/ブルーレイ" },
  { id: 404, label: "本・音楽・ゲーム / ゲーム" },
  { id: 501, label: "おもちゃ・ホビー・グッズ / キャラクターグッズ" },
  { id: 502, label: "おもちゃ・ホビー・グッズ / 楽器/機材" },
  { id: 503, label: "おもちゃ・ホビー・グッズ / トレーディングカード" },
  { id: 601, label: "スポーツ・レジャー / アウトドア" },
  { id: 602, label: "スポーツ・レジャー / スポーツ用品" },
  { id: 701, label: "コスメ・香水・美容 / ベースメイク" },
  { id: 702, label: "コスメ・香水・美容 / 香水" },
  { id: 801, label: "その他 / その他" },
];

export function categoryByID(id: number) {
  return categoryOptions.find((category) => category.id === id) ?? categoryOptions[categoryOptions.length - 1];
}

export function categoryByLabel(label: string) {
  return categoryOptions.find((category) => category.label === label) ?? categoryOptions[categoryOptions.length - 1];
}

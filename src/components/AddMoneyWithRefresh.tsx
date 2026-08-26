"use client";

import { useRouter } from "next/navigation";
import { AddMoneyForm } from "./AddMoneyForm";

export function AddMoneyWithRefresh({ itemId }: { itemId: string }) {
  const router = useRouter();
  return <AddMoneyForm itemId={itemId} onAdded={() => router.refresh()} />;
}

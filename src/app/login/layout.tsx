import { Suspense } from "react";
import LoginPage from "./page";

export default function LoginLayout() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">Loading...</div>
      }
    >
      <LoginPage />
    </Suspense>
  );
}

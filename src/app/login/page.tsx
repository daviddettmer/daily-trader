import LoginForm from "./LoginForm";
import { config } from "@/lib/config";

export default function LoginPage() {
  return (
    <LoginForm usernameRequired={Boolean(config.appUsername)} />
  );
}

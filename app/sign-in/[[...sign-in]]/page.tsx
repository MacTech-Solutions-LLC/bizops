import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="shell">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </main>
  );
}

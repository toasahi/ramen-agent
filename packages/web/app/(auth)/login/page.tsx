'use client';

import { signIn } from "@/lib/auth-client";
import { createAuthClient } from "better-auth/react"
const { useSession } = createAuthClient() 

export default function Login() {

    const {
        data: session,
        isPending,
        error
    } = useSession();

    console.log(session);

    async function handleLogin() {
        await signIn();
    }

  return (
    <section>
        <button type="button" onClick={handleLogin}>Login</button>
    </section>
);
}

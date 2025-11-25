import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    fetchOptions: {
        retry: 3,
    }
});

export const signIn = async () => {
    await authClient.signIn.social({
        provider: 'github',
    });
}

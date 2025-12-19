// app/components/SignInButtons.tsx
import React from 'react';
import { getSupabaseBrowserClient } from '~/utils/supabase.client';

export default function SignInButtons() {
  const supabase = getSupabaseBrowserClient();

  const signInWithGitHub = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        // optional: redirectTo or scopes
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    // When running in the browser, signInWithOAuth will redirect automatically for web flow.
    if (error) console.error('OAuth signIn error', error);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Sign out error', error);
    else window.location.reload();
  };

  return (
    <div>
      <button onClick={signInWithGitHub}>Sign in with GitHub</button>
      <button onClick={signOut}>Sign out</button>
    </div>
  );
}
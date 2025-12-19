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
    <div className="space-y-2">
      <button
        onClick={signInWithGitHub}
        className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {/* It would be great to add a GitHub icon here! */}
        Sign in with GitHub
      </button>
      <button
        onClick={signOut}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        Sign out
      </button>
    </div>
  );
}
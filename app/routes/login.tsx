import React, { useState, useEffect } from "react";
import {
  Form,
  useActionData,
  useNavigation,
  useRouteLoaderData,
} from "@remix-run/react";
import SignInButtons from "~/components/SignInButtons";
import { ActionFunctionArgs, redirect } from "@remix-run/node";
import { createSupabaseServerClient } from "~/utils/supabase.server";
import { loader } from "~/root";

export const action = async ({ request }: ActionFunctionArgs) => {
  // Initialize Supabase client with cookie handling
  const { client, headers } = createSupabaseServerClient(request);
  const supabase = client;

  const formData = Object.fromEntries(await request.formData());
  const Intent = formData?.intent;
  const Password = formData?.password;
  const Email = formData?.email;
  const Username = formData?.username;

  if (Intent == "signup") {
    const { error, data } = await supabase.auth.signUp({
      email: Email.toString() || "",
      password: Password.toString() || "",
    });
    if (error) {
      return Response.json(
        {
          error,
          user: null,
          intent: Intent,
        },
        { headers }
      );
    } else {
      return redirect(
        `/myhome?intent=signup&username=${Username}&verified=false&provider=email`,
        { headers }
      );
    }
  } else if (Intent == "login") {
    const {
      data: { user },
      error,
    } = await supabase.auth.signInWithPassword({
      email: Email.toString() || "",
      password: Password.toString() || "",
    });
    if (user?.id) {
      return redirect(`/myhome?intent=login&provider=email`, { headers });
    } else {
      return Response.json(
        {
          error,
          user,
          intent: Intent,
        },
        { headers }
      );
    }
  } else {
    return Response.json(
      {
        error: "Unknown server response",
        user: null,
        intent: Intent,
      },
      { headers }
    );
  }
};

export default function Login() {
  const loginAction = useActionData<typeof action>();
  const [isSignUp, setIsSignUp] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [btnDisable, setBtnDisable] = useState(false);
  const [loading, setIsLoading] = useState(false);
  const [isError, setError] = useState(false);
  const UserContext = useRouteLoaderData<typeof loader>("root");
  const navigation = useNavigation();

  useEffect(() => {
    const checkSignUp = localStorage.getItem("auth");
    if (checkSignUp && JSON.parse(checkSignUp).new_signup) {
      setEmailSent(true);
    }
    if (UserContext?.user?.id) {
      setBtnDisable(true);
    }
    if (loginAction?.error && loginAction?.intent) {
      setError(true);
      console.error(loginAction?.error);
    }

    if (navigation.state === "submitting") {
      setIsLoading(true);
    } else if (navigation.state === "idle") {
      setIsLoading(false);
    }

    return () => {
      true;
    };
  }, [loginAction, navigation]);

  return (
    <div>
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            {isSignUp ? "Sign Up" : "Login"}
          </h2>
          <SignInButtons />
          <div className="my-6 flex items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="mx-4 flex-shrink text-sm text-gray-500">OR</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>
          <Form className="space-y-4" method="post">
            {isSignUp && (
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700"
                >
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            )}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              name="intent"
              value={isSignUp ? "signup" : "login"}
              disabled={btnDisable}
            >
              <span
                className={
                  loading
                    ? `inline-block
        h-4 w-4
        animate-spin
        rounded-full
        border-2
        border-current
        border-t-transparent`
                    : ``
                }
              >
                {loading ? "" : isSignUp ? "Sign Up" : "Login"}
              </span>
            </button>
            <div className="text-center">
              {emailSent && (
                <div className="text-green-900">
                  <h3 className="">
                    This Email is not yet verified: {UserContext?.user?.email}.
                  </h3>
                </div>
              )}
              {isError && (
                <div className="text-red-700">
                  <h3 className="text-green-900">
                    Error when login/signup. please enter a valid email and
                    password.
                  </h3>
                </div>
              )}
            </div>
          </Form>
          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              {isSignUp
                ? "Already have an account? Login"
                : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

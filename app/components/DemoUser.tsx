import { Link } from "@remix-run/react";

export default function DemoUser() {
  return (
    <div className="mx-auto max-w-xl text-center">
      <h1 className="text-3xl font-bold">Welcome to React Chess</h1>

      <p className="mt-4 text-gray-600">
        Play chess games, analyze games, and improve faster.
      </p>

      <Link
        to="/login"
        className="mt-6 inline-block rounded bg-blue-600 px-4 py-2 text-white"
      >
        Create an account or log in
      </Link>
    </div>
  );
}

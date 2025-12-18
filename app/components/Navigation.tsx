import { Form, NavLink } from "@remix-run/react";

export default function Navigation({ context }: any) {
  const { session } = context;
  return (
    <nav className="bg-gray-800 p-4">
      <ul className="flex space-x-6">
        <li>
          <NavLink
            to="/"
            className={({ isActive }) =>
              `text-white hover:text-gray-300 ${isActive ? "font-bold" : ""}`
            }
          >
            Chess
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/play"
            className={({ isActive }) =>
              `text-white hover:text-gray-300 ${isActive ? "font-bold" : ""}`
            }
          >
            Play
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/MyHome"
            className={({ isActive }) =>
              `text-white hover:text-gray-300 ${isActive ? "font-bold" : ""}`
            }
          >
            MyHome
          </NavLink>
        </li>
        {session?.user ? (
          <li>
            <Form
              id="logoutForm"
              action={`/logout/${session.user.id}`}
              method="post"
            >
              <button type="submit" className="btn btn-xs btn-error">Logout</button>
            </Form>
          </li>
        ) : (
          <div className=""></div>
        )}
      </ul>
    </nav>
  );
}
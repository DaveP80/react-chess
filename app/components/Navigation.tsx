import { Form, NavLink } from "@remix-run/react";

export default function Navigation() {
  const session = {user: null};
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
              action={`/logout`}
              method="post"
            >
              <button type="submit" className="btn btn-xs btn-error">Logout</button>
            </Form>
          </li>
        ) : (
          <li>
          <Form
            id="logoutForm"
            action={`/myhome`}
          >
            <button type="submit" className="btn btn-xs btn-error">Login</button>
          </Form>
        </li>
        )}
      </ul>
    </nav>
  );
}
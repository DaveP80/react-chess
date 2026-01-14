import { Form, NavLink, useNavigate } from "@remix-run/react";

export default function Navigation({user}) {
  const navigate = useNavigate();


  async function handleLogout(): Promise<void> {
    try {
      const localAuth = await localStorage.getItem("auth");
      if (localAuth) {
        localStorage.removeItem("auth");
      }
      navigate("/logout?query=navbar");
    } catch (e) {
      console.error(e);
    }
  }

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
            to="/game/1"
            className={({ isActive }) =>
              `text-white hover:text-gray-300 ${isActive ? "font-bold" : ""}`
            }
          >
            Play
          </NavLink>
        </li>
        <li>
          <NavLink
            to={`/myhome`}
            className={({ isActive }) =>
              `text-white hover:text-gray-300 ${isActive ? "font-bold" : ""}`
            }
          >
            MyHome
          </NavLink>
        </li>
        {user?.id ? (
          <li>
            <Form id="logoutForm">
              <button
                onClick={() => handleLogout()}
                type="button"
                className="btn btn-md text-green-800 font-bold"
                name="intent"
                value="logout"
              >
                Logout
              </button>
            </Form>
          </li>
        ) : (
          <li>
            <Form id="loginForm" action={`/login`}>
              <button
                type="submit"
                className="btn btn-md text-green-800 font-bold"
              >
                Login
              </button>
            </Form>
          </li>
        )}
      </ul>
    </nav>
  );
}

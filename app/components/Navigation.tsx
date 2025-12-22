import {
  Form,
  NavLink,
  useNavigate,
  useNavigation,
} from "@remix-run/react";
import {  useContext, useEffect, useState } from "react";
import { GlobalContext } from "~/context/globalcontext";

export default function Navigation() {
  const [userData, setUserData] = useState(false);
  const UserContext = useContext(GlobalContext);
  const navigation = useNavigation();
  const navigate = useNavigate();

  useEffect(() => {
    if (navigation.state == "idle" || navigation.state == "loading") {
      if (UserContext?.user.id) {
        setUserData(true);
      } else if (!UserContext?.user.id) {
        setUserData(false);
      }
    }

    return () => {
      true;
    };
  }, [navigation.state]);

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
            to={`/myhome?id=${UserContext?.user.id}&email=${UserContext?.user.email}&provider=${UserContext?.user.provider}`}
            className={({ isActive }) =>
              `text-white hover:text-gray-300 ${isActive ? "font-bold" : ""}`
            }
          >
            MyHome
          </NavLink>
        </li>
        {userData ? (
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

import { Form, NavLink, useNavigate, useNavigation, useRevalidator, useRouteLoaderData } from "@remix-run/react";
import { useContext, useEffect, useState } from "react";
import { GlobalContext } from "~/context/globalcontext";
import { loader } from "~/root";
import { MyHomeData } from "~/types";

export default function Navigation({user}) {
  const [userData, setUserData] = useState(false);
  const { user: UserContext } = useRouteLoaderData<typeof loader>("root");
  const navigation = useNavigation();
  const navigate = useNavigate();
  const revalidator = useRevalidator();

  // useEffect(() => {
  //   if (navigation.state == "idle" || navigation.state == "loading") {
  //     if (UserContext?.user?.id) {
  //       setUserData(true);
  //     } else {
  //       setUserData(false);
  //     }
  //   }

  //   return () => {
  //     true;
  //   };
  // }, [navigation.state]);

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

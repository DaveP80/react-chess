import { Form, useActionData, useNavigate, useNavigation, useRouteLoaderData } from "@remix-run/react";
import { useContext, useEffect, useState } from "react";
import { action as rematchRequestAction } from "~/actions/rematch_handler.server";
import { GlobalContext } from "~/context/globalcontext";
import { loader } from "~/root";
import { generateRematchRequestFormObj } from "~/utils/helper";

// Constants for countdown

export default function RematchRequestMaker({
  currentGameData,
  username,
  timeControl,
  isRated,
  colorPreference,
  supabase,
}) {
  const actionData = useActionData<typeof rematchRequestAction>();
  const [rematchRequest, setRematchRequest] = useState(null);
  const ActiveContext = useContext(GlobalContext);
  const navigation = useNavigation();

  const isSubmitting = navigation.state == "submitting";

  const isDisabled = isSubmitting || actionData?.data?.[0]?.id;

  // Handle successful form submission - start searching and countdown timer
  useEffect(() => {
    if (actionData?.go == true) {
      setRematchRequest((prev) => ({
        ...prev,
        actionData: actionData.data[0],
        ref: 1,
      }));
    }
    return () => {
      true;
    };
  }, [actionData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      ActiveContext.setMemberRequestLock(false);
    }, 180_000); // 180 seconds

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const RematchRequestMemberData =
    generateRematchRequestFormObj(currentGameData);

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <main>
        <h3>Send Rematch with: {username}</h3>
        <Form
          method="post"
          className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <input
            name="timeControl"
            value={timeControl}
            required
            hidden
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
          />
          <input
            name="colorPreference"
            value={colorPreference}
            required
            hidden
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
          />
          <input hidden name="isRated" value={isRated ? "true" : "false"} />
          <input hidden name="username" value={username} />
          <input
            hidden
            name="requestGameData"
            value={JSON.stringify(RematchRequestMemberData)}
          />

          <button
            type="submit"
            disabled={isDisabled}
            className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                isDisabled
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            Send Rematch Request
          </button>

          {actionData?.error && (
            <p className="text-sm text-red-600">{actionData.error}</p>
          )}
        </Form>
      </main>
    </div>
  );
}

import { Form, useActionData, useNavigation } from "@remix-run/react";
import { useContext, useEffect, useState } from "react";
import { action as rematchRequestAction } from "~/actions/rematch_handler.server";
import { GlobalContext } from "~/context/globalcontext";
import { generateRematchRequestFormObj } from "~/utils/helper";
import { RotateCcw, Clock, Trophy, User } from "lucide-react";
import RematchRequestNotification from "./RematchRequestNotification";

export default function RematchRequestMaker({
  currentGameData,
  username,
  timeControl,
  isRated,
  colorPreference,
}) {
  const actionData = useActionData<typeof rematchRequestAction>();
  const [rematchRequest, setRematchRequest] = useState({});
  const [showNotification, setShowNotification] = useState(false);
  const ActiveContext = useContext(GlobalContext);
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";
  const isDisabled = isSubmitting || actionData?.data?.[0]?.id;
  const hasSentRequest = actionData?.go === true && rematchRequest?.ref === 1;

  // Handle successful form submission - start searching and countdown timer
  useEffect(() => {
    if (actionData?.go === true) {
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
    }, 180_000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const RematchRequestMemberData =
    generateRematchRequestFormObj(currentGameData);

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-xl border border-slate-700 bg-slate-800/90 shadow-xl overflow-hidden">
        {/* Header accent */}
        <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <RotateCcw className="text-amber-400" size={20} />
            <h3 className="text-white font-semibold">Rematch</h3>
          </div>

          {/* Opponent info card */}
          <div className="flex items-center gap-3 mb-4 rounded-lg bg-slate-700/50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white">
              {username?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate flex items-center gap-2">
                <User size={14} className="text-slate-400" />
                {username}
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {timeControl}
                </span>
                <span className="flex items-center gap-1">
                  <Trophy size={12} />
                  {isRated ? "Rated" : "Casual"}
                </span>
              </div>
            </div>
          </div>

          {/* Notification area - shows when waiting for response or receiving request */}
          <RematchRequestNotification
            rematchRequest={rematchRequest}
            setRematchRequest={setRematchRequest}
            showNotification={showNotification}
            setShowNotification={setShowNotification}
          />

          {/* Send rematch form - hide when notification is showing */}
          {!showNotification && !hasSentRequest && (
            <Form method="post">
              <input name="timeControl" value={timeControl} required hidden />
              <input
                name="colorPreference"
                value={colorPreference}
                required
                hidden
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
                className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 
                           text-sm font-semibold text-white shadow-sm transition-all
                           focus:outline-none focus:ring-2 focus:ring-amber-500/40
                           ${
                             isDisabled
                               ? "bg-slate-600 cursor-not-allowed opacity-60"
                               : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-[0.98]"
                           }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RotateCcw size={16} />
                    Send Rematch Request
                  </>
                )}
              </button>

              {actionData?.error && (
                <p className="mt-2 text-sm text-red-400 text-center">
                  {actionData.error}
                </p>
              )}
            </Form>
          )}

          {/* Waiting indicator when request sent */}
          {hasSentRequest && !showNotification && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-8 w-8 rounded-full border-2 border-amber-500/30" />
                  <div className="absolute inset-0 h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-400">
                    Waiting for {username}...
                  </p>
                  <p className="text-xs text-amber-400/70 mt-0.5">
                    Request expires in 3 minutes
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

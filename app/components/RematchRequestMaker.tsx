import { Form, useActionData, useNavigation } from "@remix-run/react";
import { useContext, useEffect, useState } from "react";
import { action as rematchRequestAction } from "~/actions/rematch_handler.server";
import { GlobalContext } from "~/context/globalcontext";
import {
  generateRematchRequestFormObj,
  resolveRematchComponent,
} from "~/utils/helper";
import { RotateCcw, Clock, Trophy, User, CircleEllipsis } from "lucide-react";
import RematchRequestNotification from "./RematchRequestNotification";

export default function RematchRequestMaker({
  currentGameData,
  username,
  timeControl,
  isRated,
  colorPreference,
  abortMessage,
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
    let timer: ReturnType<typeof setTimeout> | undefined;

    const gameEnded =
      currentGameData?.finalGameData?.pgn_info?.result ||
      abortMessage.length > 0;

    // Only set the timeout if game ended AND we haven't already started the timeout
    if (gameEnded && !ActiveContext.rematchTimeoutStarted) {
      // Mark that we've started the timeout (persists across remounts)
      ActiveContext.setRematchTimeoutStarted(true);

      let seconds_diff = 0;
      resolveRematchComponent(currentGameData, seconds_diff, abortMessage);

      timer = setTimeout(() => {
        ActiveContext.setMemberRequestLock(false);
      }, 180_000 - seconds_diff);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [currentGameData.finalGameData, abortMessage]);

  const RematchRequestMemberData =
    generateRematchRequestFormObj(currentGameData);

  if (currentGameData.gameData?.status == "end") {
    return null;
  } else if (
    currentGameData?.finalGameData?.pgn_info?.result ||
    abortMessage.length > 0
  ) {
    if (rematchRequest?.ref) {
      username = rematchRequest.actionData.username;
      timeControl = rematchRequest.actionData.timecontrol;
      isRated = rematchRequest.actionData.is_rated;
    };
    return (
      <div className="">
      {/* Notification area */}
      <RematchRequestNotification
        rematchRequest={rematchRequest}
        setRematchRequest={setRematchRequest}
        showNotification={showNotification}
        setShowNotification={setShowNotification}
      />

      {/* Send rematch form - hide when notification is showing */}
      {!showNotification && !hasSentRequest && (
        <Form method="post">
          <input name="timeControl" value={timeControl} hidden readOnly/>
          <input
            name="colorPreference"
            value={colorPreference}
            hidden
            readOnly
          />
          <input
            hidden
            name="isRated"
            value={isRated ? "true" : "false"}
            readOnly
          />
          <input hidden name="username" value={username} readOnly/>
          <input
            hidden
            name="requestGameData"
            value={JSON.stringify(RematchRequestMemberData)}
            readOnly
          />
          <input hidden name="isPairingMaker" value="false" readOnly />

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
              <CircleEllipsis size={16} />
            ) : (
              <span>Rematch</span>
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
        <div className="flex items-center justify-center gap-2 rounded-lg px-4 py-3 bg-slate-600 opacity-60">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <span className="text-sm font-semibold text-white truncate max-w-[120px]">
            {username || "..."}
          </span>
        </div>
      )}
    </div>
    );
  } else {
    return null;
  }
}

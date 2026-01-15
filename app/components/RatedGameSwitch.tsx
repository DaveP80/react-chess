import { useRouteLoaderData } from "@remix-run/react";
import { useState } from "react";

interface RatedGameSwitchProps {
  defaultRated?: boolean;
  isRated?: boolean;
  setIsRated?: (isRated: boolean) => void;
  disabled?: boolean;
}

export function RatedGameSwitch({
  defaultRated = false,
  isRated,
  setIsRated,
  disabled = false,
}: RatedGameSwitchProps) {
  const Data = useRouteLoaderData("root");

  const handleToggle = () => {
    if (disabled) return;
    const newValue = !isRated;
    setIsRated(newValue);
    if (Data?.rowData &&  !Data.rowData.isActive) {
      localStorage.setItem(
        "pairing_info",
        JSON.stringify({
          ...JSON.parse(
            localStorage.getItem("pairing_info") || "{}"
          ),
          isRated: newValue,
        })
      );

    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex flex-col">
        <label
          htmlFor="rated-switch"
          className="text-sm font-medium text-gray-900 cursor-pointer"
        >
          Game Type
        </label>
        <span className="text-xs text-gray-500 mt-1">
          {isRated
            ? "This game will affect your rating"
            : "This game is for practice only"}
        </span>
      </div>

      <button
        id="rated-switch"
        type="button"
        role="switch"
        aria-checked={isRated}
        disabled={disabled}
        onClick={handleToggle}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full
          transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          ${isRated ? "bg-blue-600" : "bg-gray-300"}
        `}
      >
        <span className="sr-only">Toggle rated game</span>
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${isRated ? "translate-x-6" : "translate-x-1"}
          `}
        />
      </button>

      <div className="ml-3 flex items-center gap-2">
        <span
          className={`text-sm font-medium ${
            isRated ? "text-blue-600" : "text-gray-400"
          }`}
        >
          {isRated ? "Rated" : "Unrated"}
        </span>
      </div>
    </div>
  );
}

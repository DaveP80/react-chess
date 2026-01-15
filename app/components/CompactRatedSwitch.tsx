import { useState } from "react";

interface CompactRatedSwitchProps {
  defaultRated?: boolean;
  onChange?: (isRated: boolean) => void;
  disabled?: boolean;
  name?: string;
}

/**
 * Compact inline switch for rated/unrated game selection
 * Perfect for forms where space is limited
 */
export function CompactRatedSwitch({
  defaultRated = false,
  onChange,
  disabled = false,
  name = "isRated",
}: CompactRatedSwitchProps) {
  const [isRated, setIsRated] = useState(defaultRated);

  const handleToggle = () => {
    if (disabled) return;
    const newValue = !isRated;
    setIsRated(newValue);
    onChange?.(newValue);
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-700">Unrated</span>
      
      <button
        type="button"
        role="switch"
        aria-checked={isRated}
        aria-label="Toggle rated game"
        disabled={disabled}
        onClick={handleToggle}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full
          transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          ${isRated ? "bg-blue-600" : "bg-gray-300"}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${isRated ? "translate-x-6" : "translate-x-1"}
          `}
        />
      </button>

      <span className={`text-sm font-medium ${isRated ? "text-blue-600" : "text-gray-700"}`}>
        Rated
      </span>

      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={isRated.toString()} />
    </div>
  );
}

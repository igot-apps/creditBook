import { useState } from "react";

export function ReasonPicker({ value, onChange, options, accent = "blue", placeholder = "Type the reason here..." }) {
  const [customSelected, setCustomSelected] = useState(false);
  const isPreset = options.includes(value);
  const showCustom = customSelected || Boolean(value && !isPreset);
  const selectedClass = accent === "red"
    ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
    : accent === "purple"
      ? "border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
      : "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {options.map(option => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option && !showCustom}
            onClick={() => { setCustomSelected(false); onChange(option); }}
            className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${value === option && !showCustom
              ? selectedClass
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"}`}
          >
            {option}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={showCustom}
          onClick={() => { setCustomSelected(true); onChange(""); }}
          className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${showCustom
            ? selectedClass
            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"}`}
        >
          Other reason
        </button>
      </div>
      {showCustom && (
        <textarea
          autoFocus
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          rows="3"
        />
      )}
    </div>
  );
}

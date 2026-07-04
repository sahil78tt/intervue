import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

function Dropdown({ value, options, onChange, placeholder }) {
  var [isOpen, setIsOpen] = useState(false);
  var dropdownRef = useRef(null);

  useEffect(function () {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return function () {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(
    function () {
      if (!isOpen) return;

      function handleEsc(e) {
        if (e.key === "Escape") setIsOpen(false);
      }

      window.addEventListener("keydown", handleEsc);
      return function () {
        window.removeEventListener("keydown", handleEsc);
      };
    },
    [isOpen],
  );

  function handleSelect(optionValue) {
    onChange(optionValue);
    setIsOpen(false);
  }

  var selectedOption = options.find(function (opt) {
    return opt.value === value;
  });

  var displayLabel = selectedOption
    ? selectedOption.label
    : placeholder || "Select";

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={function () {
          setIsOpen(!isOpen);
        }}
        className={
          "flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full transition-colors duration-150 " +
          (isOpen
            ? "bg-surface-2 text-ink"
            : "text-ink-muted hover:text-ink hover:bg-surface-1")
        }
      >
        <span>{displayLabel}</span>
        <ChevronDown
          size={12}
          strokeWidth={2}
          className={
            "transition-transform duration-150 " + (isOpen ? "rotate-180" : "")
          }
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 min-w-[160px] bg-surface-1 border border-hairline rounded-lg py-1 z-50 overflow-hidden"
          style={{ animation: "dropdownIn 0.15s ease-out" }}
        >
          {options.map(function (opt) {
            var isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                onClick={function () {
                  handleSelect(opt.value);
                }}
                className={
                  "w-full text-left px-3 py-2 text-[12px] font-medium transition-colors duration-100 flex items-center justify-between " +
                  (isSelected
                    ? "text-ink bg-surface-2"
                    : "text-ink-muted hover:text-ink hover:bg-surface-2")
                }
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <div className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}

      <style>
        {
          "\n        @keyframes dropdownIn {\n          from { opacity: 0; transform: translateY(-4px); }\n          to { opacity: 1; transform: translateY(0); }\n        }\n      "
        }
      </style>
    </div>
  );
}

export default Dropdown;

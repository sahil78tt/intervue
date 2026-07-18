import { useState, useEffect, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";
import api from "../api/axios";
import { toastSuccess, toastError } from "../lib/toast";

const LANGUAGE_OPTIONS = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "java", label: "Java" },
];

function CreateRoomModal({ onClose, onRoomCreated }) {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [isLoading, setIsLoading] = useState(false);
  const [fadeClass, setFadeClass] = useState("opacity-0 scale-95");

  const nameRef = useRef(null);

  useEffect(function () {
    const timer = setTimeout(function () {
      setFadeClass("opacity-100 scale-100");
      if (nameRef.current) {
        nameRef.current.focus();
      }
    }, 50);

    return function () {
      clearTimeout(timer);
    };
  }, []);

  useEffect(function () {
    function handleEsc(e) {
      if (e.key === "Escape") {
        handleClose();
      }
    }

    window.addEventListener("keydown", handleEsc);

    return function () {
      window.removeEventListener("keydown", handleEsc);
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post("/rooms", {
        name: name.trim(),
        language: language,
      });

      toastSuccess("ROOM CREATED", name + " is ready.");
      onRoomCreated(response.data.data.room);
      handleClose();
    } catch (err) {
      toastError("CREATE FAILED", "Could not create room.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleClose() {
    setFadeClass("opacity-0 scale-95");
    setTimeout(function () {
      onClose();
    }, 200);
  }

  function handleBackdropClick() {
    handleClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={handleBackdropClick}
        className="absolute inset-0 bg-semantic-overlay/70 backdrop-blur-sm"
      />

      <div
        onClick={function (e) {
          e.stopPropagation();
        }}
        className={
          "relative w-full max-w-[400px] bg-canvas border border-hairline rounded-xl transition-all duration-300 ease-out " +
          fadeClass
        }
      >
        <div className="p-6">
          <h2 className="text-[18px] font-medium text-ink tracking-tight mb-1.5">
            Create new room
          </h2>
          <p className="text-[13px] text-ink-subtle mb-6">
            Set up your interview environment.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-mono text-ink-tertiary uppercase tracking-widest">
                room name
              </label>
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={function (e) {
                  setName(e.target.value);
                }}
                placeholder="e.g. Frontend Engineering Interview"
                className="w-full bg-surface-1 border border-hairline text-ink text-[14px] px-4 py-3 rounded-full placeholder:text-ink-tertiary focus:outline-none focus:border-hairline-strong transition-colors duration-150"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-mono text-ink-tertiary uppercase tracking-widest">
                language
              </label>
              <ModalDropdown
                value={language}
                options={LANGUAGE_OPTIONS}
                onChange={setLanguage}
              />
            </div>

            <div className="flex flex-col gap-2 mt-3">
              <button
                type="submit"
                disabled={isLoading || !name.trim()}
                className="w-full bg-primary hover:bg-primary-hover text-white text-[14px] font-medium py-3 rounded-full transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? "Creating..." : "Create room"}
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="w-full text-ink-subtle hover:text-ink text-[13px] font-medium py-2 transition-colors duration-150"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ModalDropdown({ value, options, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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
      if (!isOpen) {
        return;
      }

      function handleEsc(e) {
        if (e.key === "Escape") {
          setIsOpen(false);
        }
      }

      window.addEventListener("keydown", handleEsc);

      return function () {
        window.removeEventListener("keydown", handleEsc);
      };
    },
    [isOpen],
  );

  const selectedOption = options.find(function (option) {
    return option.value === value;
  });

  function handleSelect(optionValue) {
    onChange(optionValue);
    setIsOpen(false);
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={function () {
          setIsOpen(!isOpen);
        }}
        className="w-full bg-surface-1 border border-hairline text-ink text-[14px] px-4 py-3 rounded-full focus:outline-none focus:border-hairline-strong transition-colors duration-150 flex items-center justify-between"
      >
        <span>{selectedOption ? selectedOption.label : "Select language"}</span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={
            "text-ink-tertiary transition-transform duration-150 " +
            (isOpen ? "rotate-180" : "")
          }
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full mt-2 bg-surface-1 border border-hairline rounded-xl overflow-hidden z-50"
          style={{ animation: "dropdownIn 0.15s ease-out" }}
        >
          {options.map(function (option) {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={function () {
                  handleSelect(option.value);
                }}
                className={
                  "w-full px-4 py-2.5 flex items-center justify-between text-left text-[13px] transition-colors duration-150 " +
                  (isSelected
                    ? "bg-surface-2 text-ink"
                    : "text-ink-subtle hover:bg-surface-2 hover:text-ink")
                }
              >
                <span>{option.label}</span>
                {isSelected && (
                  <Check size={13} strokeWidth={2.5} className="text-primary" />
                )}
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes dropdownIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default CreateRoomModal;

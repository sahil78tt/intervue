import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import Editor from "@monaco-editor/react";

const LANGUAGES = ["javascript", "python", "cpp", "c", "java", "typescript"];

function RoomPage() {
  const navigate = useNavigate();
  const { shareLink } = useParams();

  // Code editor state
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");

  // Problem statement state
  const [problemStatement, setProblemStatement] = useState("");
  const [isEditingProblem, setIsEditingProblem] = useState(false);
  const [problemSaving, setProblemSaving] = useState(false);

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [outputError, setOutputError] = useState("");

  // Room state
  const [room, setRoom] = useState(null);
  const [role, setRole] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Copy status state
  const [copyStatus, setCopyStatus] = useState("copy link");

  // Fetch room details when page loads
  useEffect(
    function () {
      const fetchRoom = async function () {
        try {
          const response = await api.get("/rooms/" + shareLink);
          setRoom(response.data.data.room);
          setRole(response.data.data.role);
        } catch (err) {
          console.log("Fetch room error:", err.message);
          if (err.response && err.response.data && err.response.data.message) {
            setError(err.response.data.message);
          } else {
            setError("Failed to load room.");
          }
        } finally {
          setIsLoading(false);
        }
      };

      fetchRoom();
    },
    [shareLink],
  );

  // When room loads, set editor language to match room's default
  useEffect(
    function () {
      if (room) {
        setLanguage(room.language);
        setCode(getStarterCode(room.language));
        setProblemStatement(room.problem_statement || "");
      }
    },
    [room],
  );

  // Returns starter template code for each language
  function getStarterCode(lang) {
    const starters = {
      javascript:
        "// Write your JavaScript code here\nconsole.log('Hello, Intervue!');",
      python: "# Write your Python code here\nprint('Hello, Intervue!')",
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "Hello, Intervue!" << endl;\n  return 0;\n}',
      c: '#include <stdio.h>\n\nint main() {\n  printf("Hello, Intervue!\\n");\n  return 0;\n}',
      java: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, Intervue!");\n  }\n}',
      typescript:
        "// Write your TypeScript code here\nconst greeting: string = 'Hello, Intervue!';\nconsole.log(greeting);",
    };
    return starters[lang] || "";
  }

  // Save problem statement (host only)
  const handleSaveProblem = async function () {
    setProblemSaving(true);
    try {
      await api.patch("/rooms/" + shareLink + "/problem", {
        problem_statement: problemStatement,
      });
      setIsEditingProblem(false);
    } catch (err) {
      console.log("Save problem error:", err.message);
      alert("Failed to save problem. Try again.");
    } finally {
      setProblemSaving(false);
    }
  };

  // Send code to backend for execution
  const handleRunCode = async function () {
    setIsRunning(true);
    setOutput("");
    setOutputError("");
    try {
      const response = await api.post("/execute", {
        language: language,
        code: code,
      });
      // Backend returns { output, memory, cpuTime, statusCode }
      const result = response.data.data;
      setOutput(result.output);
    } catch (err) {
      console.log("Run code error:", err.message);
      if (err.response && err.response.data && err.response.data.message) {
        setOutputError(err.response.data.message);
      } else {
        setOutputError("Failed to run code. Try again.");
      }
    } finally {
      setIsRunning(false);
    }
  };

  // Copy share link to clipboard
  const handleCopyLink = function () {
    const fullLink = window.location.href;
    navigator.clipboard.writeText(fullLink);
    // Change button text temporarily
    setCopyStatus("copied ✓");
    setTimeout(function () {
      setCopyStatus("copy link");
    }, 2000);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading room...</p>
      </div>
    );
  }

  // Error state — room doesn't exist OR user not a member
  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <p className="text-black text-lg">{error}</p>
        <button
          onClick={function () {
            navigate("/dashboard");
          }}
          className="h-10 px-6 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-900 transition-colors"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Navbar */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-6">
          <span className="text-black  text-xl font-semibold">Intervue</span>
          <span className="text-gray-300">|</span>
          <span className="text-black text-sm">{room.name}</span>
          <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
            {role}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleCopyLink}
            className="text-gray-500 text-sm font-semibold hover:text-black transition-colors"
          >
            {copyStatus}
          </button>

          <button
            onClick={function () {
              navigate("/dashboard");
            }}
            className="text-gray-500 text-sm font-semibold hover:text-black transition-colors"
          >
            ← back
          </button>
        </div>
      </header>

      {/* Main split layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT — Editor area */}
        <div className="flex-1 flex flex-col border-r border-gray-200 overflow-hidden">
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200 flex-shrink-0">
            <select
              value={language}
              onChange={function (e) {
                setLanguage(e.target.value);
              }}
              className="text-xs text-black uppercase tracking-wider font-medium bg-white cursor-pointer hover:text-gray-500 transition-colors"
            >
              {LANGUAGES.map(function (lang) {
                return (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                );
              })}
            </select>

            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="h-8 px-4 bg-black text-white text-xs font-semibold rounded-full hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? "Running..." : "Run code"}
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={language}
              value={code}
              onChange={function (newValue) {
                setCode(newValue || "");
              }}
              theme="vs"
              options={{
                fontSize: 14,
                fontFamily: "'Fira Code', 'Consolas', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 16 },
                lineNumbers: "on",
                renderLineHighlight: "none",
                overviewRulerBorder: false,
                hideCursorInOverviewRuler: true,
              }}
            />
          </div>
        </div>

        {/* RIGHT — Panels */}
        <div className="w-[400px] flex flex-col">
          {/* Problem panel */}
          <div className="flex-1 border-b border-gray-200 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                Problem
              </p>
              {role === "host" && !isEditingProblem && (
                <button
                  onClick={function () {
                    setIsEditingProblem(true);
                  }}
                  className="text-xs text-gray-500 font-semibold hover:text-black transition-colors"
                >
                  {problemStatement ? "edit" : "+ add"}
                </button>
              )}
              {role === "host" && isEditingProblem && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={function () {
                      setProblemStatement(room.problem_statement || "");
                      setIsEditingProblem(false);
                    }}
                    className="text-xs text-gray-500 font-semibold hover:text-black transition-colors"
                  >
                    cancel
                  </button>
                  <button
                    onClick={handleSaveProblem}
                    disabled={problemSaving}
                    className="h-7 px-3 bg-black text-white text-xs font-semibold rounded-full hover:bg-gray-900 transition-colors disabled:opacity-50"
                  >
                    {problemSaving ? "..." : "save"}
                  </button>
                </div>
              )}
            </div>

            {isEditingProblem ? (
              <textarea
                value={problemStatement}
                onChange={function (e) {
                  setProblemStatement(e.target.value);
                }}
                placeholder="Type the problem statement here..."
                autoFocus
                rows={12}
                className="w-full text-sm text-black bg-white border border-gray-200 p-3 resize-none focus:border-black transition-colors font-mono"
              />
            ) : problemStatement ? (
              <pre className="text-sm text-black whitespace-pre-wrap break-words font-sans">
                {problemStatement}
              </pre>
            ) : (
              <p className="text-gray-400 text-sm">
                {role === "host"
                  ? "No problem yet. Click + add to write one."
                  : "The host has not set a problem yet."}
              </p>
            )}
          </div>

          {/* Output panel */}
          <div className="flex-1 p-6 overflow-y-auto">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-4">
              Output
            </p>
            {isRunning && (
              <p className="text-gray-400 text-sm">Running your code...</p>
            )}
            {!isRunning && outputError && (
              <p className="text-sm text-black bg-gray-100 px-4 py-3 rounded-lg">
                {outputError}
              </p>
            )}
            {!isRunning && !outputError && output && (
              <pre className="text-sm text-black font-mono whitespace-pre-wrap break-words">
                {output}
              </pre>
            )}
            {!isRunning && !outputError && !output && (
              <p className="text-gray-400 text-sm">
                Run your code to see output.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoomPage;

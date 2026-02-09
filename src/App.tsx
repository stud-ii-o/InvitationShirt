import { useState } from "react";
import type { Answers } from "./types";
import Landing from "./components/Landing";
import ExportOnly from "./components/ExportOnly";

export default function App() {
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [mode, setMode] = useState<"landing" | "export">("landing");

  return mode === "landing" ? (
    <Landing
      onCreate={(a) => {
        setAnswers(a);
        setMode("export");
      }}
    />
  ) : (
    <ExportOnly
      answers={answers as Answers}
      onDone={() => {
        // nach Download wieder zurück
        setMode("landing");
        // optional: setAnswers(null);
      }}
    />
  );
}
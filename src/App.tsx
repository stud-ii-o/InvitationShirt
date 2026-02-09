import { useState } from "react";
import type { Answers } from "./types";
import Landing from "./components/Landing";
import ShirtPreview from "./components/ShirtPreview";

export default function App() {
  const [view, setView] = useState<"landing" | "preview">("landing");
  const [answers, setAnswers] = useState<Answers>({
    name: "",
    age: "",
    note: "",
  });

  if (view === "landing") {
    return (
      <Landing
        onCreate={(a) => {
          setAnswers(a);
          setView("preview");
        }}
      />
    );
  }

  return <ShirtPreview answers={answers} />;
}
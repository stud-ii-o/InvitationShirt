import { useState } from "react";
import type { Answers } from "../types";

export default function Landing({
  onCreate,
}: {
  onCreate: (answers: Answers) => void;
}) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [note, setNote] = useState("");

  const canSubmit = name.trim().length > 0 && age.trim().length > 0 && note.trim().length > 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 24,
        background: "#f1f2f2)",
        fontFamily: "var(--font-ui)",
        color: "#111",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div
          style={{
            fontFamily: "var(--font-name)",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: 38,
            lineHeight: 1.05,
            marginBottom: 16,
          }}
        >
          2. May
        </div>
        <div
  style={{
    fontSize: 16,
    lineHeight: 1.4,
    opacity: 0.7,
    marginBottom: 24,
    maxWidth: 420,
  }}
>
  A personal invitation, generated just for you!
</div>

        <div style={{ display: "grid", gap: 14 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nils"
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                fontSize: 16,
                fontFamily: "var(--font-ui)",
                outline: "none",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>Number</span>
            <input
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 69"
              inputMode="numeric"
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                fontSize: 16,
                fontFamily: "var(--font-ui)",
                outline: "none",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>Write something</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. The quick brown fox jumps over the lazy dog"
              rows={4}
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                fontSize: 16,
                fontFamily: "var(--font-ui)",
                outline: "none",
                resize: "none",
              }}
            />
            <div style={{ opacity: 0.6, fontSize: 13 }}>
              Write whatever you like. It shapes your shirt.
            </div>
          </label>

          <button
            disabled={!canSubmit}
            onClick={() =>
              onCreate({
                name: name.trim(),
                age: age.trim(),
                note,
              })
            }
            style={{
              marginTop: 8,
              width: "100%",
              padding: "14px 16px",
              borderRadius: 14,
              border: "none",
              cursor: canSubmit ? "pointer" : "not-allowed",
              background: canSubmit ? "#111" : "rgba(0,0,0,0.25)",
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
              fontFamily: "var(--font-ui)",
            }}
          >
            Create your Invitation Shirt
          </button>
        </div>
      </div>
    </div>
  );
}
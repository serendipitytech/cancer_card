"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { Copy, Mail, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useToast } from "@/components/ui/toast";
import { useHaptics } from "@/hooks/use-haptics";

type InviteShareActionsProps = {
  inviteCode: string;
  crewName: string;
  variant: "compact" | "full";
};

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://cancer-card.serendipitylabs.cloud";

const MAX_EMAILS = 5;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteShareActions({
  inviteCode,
  crewName,
  variant,
}: InviteShareActionsProps) {
  const { addToast } = useToast();
  const { vibrate } = useHaptics();
  const [emailOpen, setEmailOpen] = useState(false);
  const [emails, setEmails] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      vibrate("success");
      addToast("success", `Invite code ${inviteCode} copied!`);
    } catch {
      addToast("error", "Couldn't copy code. It's: " + inviteCode);
    }
  }

  function handleText() {
    const body = encodeURIComponent(
      `Hey! I'm using The Cancer Card to get help during treatment. Join my crew "${crewName}" with code: ${inviteCode}\n\nSign up: ${APP_URL}/signup`
    );
    window.open(`sms:?&body=${body}`, "_self");
  }

  function handleCloseSheet() {
    setEmailOpen(false);
    setEmails([]);
    setInputValue("");
  }

  async function handleSendEmails() {
    const allEmails = tryAddCurrent();
    if (allEmails.length === 0) return;

    setSending(true);
    try {
      const res = await fetch("/api/invite/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: allEmails }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send invites");
      }

      vibrate("success");
      const count = data.sent ?? allEmails.length;
      addToast(
        "success",
        count === 1
          ? `Invite sent to ${allEmails[0]}`
          : `Invites sent to ${count} people`
      );
      handleCloseSheet();
    } catch (error) {
      addToast(
        "error",
        error instanceof Error ? error.message : "Failed to send invites"
      );
    }
    setSending(false);
  }

  function tryAddCurrent(): string[] {
    const trimmed = inputValue.trim();
    if (trimmed && EMAIL_REGEX.test(trimmed) && !emails.includes(trimmed)) {
      const updated = [...emails, trimmed];
      setEmails(updated);
      setInputValue("");
      return updated;
    }
    return emails;
  }

  if (variant === "compact") {
    return (
      <>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleCopy} aria-label="Copy invite code">
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEmailOpen(true)} aria-label="Email invite code">
            <Mail className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleText} aria-label="Text invite code">
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>
        <EmailBottomSheet
          open={emailOpen}
          onClose={handleCloseSheet}
          emails={emails}
          setEmails={setEmails}
          inputValue={inputValue}
          setInputValue={setInputValue}
          onSend={handleSendEmails}
          sending={sending}
          crewName={crewName}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={handleCopy}>
          <Copy className="w-4 h-4" />
          Copy
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => setEmailOpen(true)}
        >
          <Mail className="w-4 h-4" />
          Email
        </Button>
        <Button variant="secondary" className="flex-1" onClick={handleText}>
          <MessageSquare className="w-4 h-4" />
          Text
        </Button>
      </div>
      <EmailBottomSheet
        open={emailOpen}
        onClose={handleCloseSheet}
        emails={emails}
        setEmails={setEmails}
        inputValue={inputValue}
        setInputValue={setInputValue}
        onSend={handleSendEmails}
        sending={sending}
        crewName={crewName}
      />
    </>
  );
}

type EmailBottomSheetProps = {
  open: boolean;
  onClose: () => void;
  emails: string[];
  setEmails: (emails: string[]) => void;
  inputValue: string;
  setInputValue: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  crewName: string;
};

function EmailBottomSheet({
  open,
  onClose,
  emails,
  setEmails,
  inputValue,
  setInputValue,
  onSend,
  sending,
  crewName,
}: EmailBottomSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function addEmail(raw: string) {
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed) return;
    if (!EMAIL_REGEX.test(trimmed)) return;
    if (emails.includes(trimmed)) return;
    if (emails.length >= MAX_EMAILS) return;
    setEmails([...emails, trimmed]);
    setInputValue("");
  }

  function removeEmail(emailToRemove: string) {
    setEmails(emails.filter((e) => e !== emailToRemove));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addEmail(inputValue);
    }
    if (e.key === "Backspace" && !inputValue && emails.length > 0) {
      setEmails(emails.slice(0, -1));
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    const parts = pasted.split(/[,;\s]+/).filter(Boolean);
    const newEmails = [...emails];
    for (const part of parts) {
      const trimmed = part.trim().toLowerCase();
      if (
        EMAIL_REGEX.test(trimmed) &&
        !newEmails.includes(trimmed) &&
        newEmails.length < MAX_EMAILS
      ) {
        newEmails.push(trimmed);
      }
    }
    setEmails(newEmails);
    setInputValue("");
  }

  const atCapacity = emails.length >= MAX_EMAILS;
  const hasRecipients = emails.length > 0 || inputValue.trim().length > 0;

  return (
    <BottomSheet open={open} onClose={onClose} title="Email Invite Code">
      <div className="space-y-4">
        <div>
          <label
            htmlFor="invite-email-input"
            className="block text-sm font-medium text-midnight mb-1.5"
          >
            Recipients
          </label>
          <div
            className="flex flex-wrap gap-2 p-3 rounded-xl border border-royal-200 bg-white focus-within:ring-2 focus-within:ring-royal/30 focus-within:border-royal min-h-[44px] cursor-text"
            onClick={() => inputRef.current?.focus()}
          >
            {emails.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1 bg-royal-50 text-royal text-sm font-medium rounded-lg px-2.5 py-1"
              >
                {email}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeEmail(email);
                  }}
                  className="text-royal/60 hover:text-royal min-h-0 min-w-0 p-0.5"
                  aria-label={`Remove ${email}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            {!atCapacity && (
              <input
                ref={inputRef}
                id="invite-email-input"
                type="email"
                className="flex-1 min-w-[180px] outline-none text-sm text-midnight placeholder:text-muted bg-transparent"
                placeholder={
                  emails.length === 0
                    ? "friend@example.com"
                    : "Add another..."
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onBlur={() => addEmail(inputValue)}
              />
            )}
          </div>
          <p className="text-xs text-muted mt-1.5">
            {atCapacity
              ? `Maximum ${MAX_EMAILS} recipients reached`
              : `Press Enter, comma, or space to add (up to ${MAX_EMAILS})`}
          </p>
        </div>

        <p className="text-sm text-muted">
          We&apos;ll send {crewName}&apos;s invite code to{" "}
          {emails.length <= 1 ? "this address" : "these addresses"}.
        </p>

        <Button
          className="w-full"
          loading={sending}
          onClick={onSend}
          disabled={!hasRecipients}
        >
          {emails.length <= 1
            ? "Send Invite"
            : `Send ${emails.length} Invites`}
        </Button>
      </div>
    </BottomSheet>
  );
}

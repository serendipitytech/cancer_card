"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACTIVE_CREW_COOKIE_NAME } from "@/lib/cookie-constants";

type Crew = {
  id: string;
  name: string;
  role: string;
};

type CrewSwitcherProps = {
  crews: Crew[];
  activeCrewId: string;
};

function getRoleLabel(role: string): string {
  if (role === "card_holder" || role === "admin") return "Patient";
  return "Support";
}

export function CrewSwitcher({ crews, activeCrewId }: CrewSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeCrew = crews.find((c) => c.id === activeCrewId) ?? crews[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function handleSwitch(crewId: string) {
    const secure = window.location.protocol === "https:" ? ";secure" : "";
    document.cookie = `${ACTIVE_CREW_COOKIE_NAME}=${crewId};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax${secure}`;
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1 text-muted text-sm font-medium hover:text-midnight transition-colors min-h-0 min-w-0"
      >
        {activeCrew?.name}
        <ChevronDown
          className={cn(
            "w-4 h-4 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Switch crew"
          className="absolute top-full left-0 mt-1 w-56 bg-surface rounded-xl shadow-raised border border-royal-100 z-50 overflow-hidden"
        >
          <div className="py-1">
            {crews.map((crew) => {
              const isActive = crew.id === activeCrewId;
              return (
                <button
                  key={crew.id}
                  role="menuitem"
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => handleSwitch(crew.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors min-h-[44px]",
                    isActive
                      ? "bg-royal-50 text-midnight"
                      : "hover:bg-cloud text-ink"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {crew.name}
                    </p>
                    <p className="text-xs text-muted">
                      {getRoleLabel(crew.role)}
                    </p>
                  </div>
                  {isActive && <Check className="w-4 h-4 text-royal flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="border-t border-royal-100">
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                router.push("/onboarding");
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-cloud transition-colors min-h-[44px]"
            >
              <Plus className="w-4 h-4 text-royal" />
              <span className="text-sm font-semibold text-royal">
                Join / Create Crew
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

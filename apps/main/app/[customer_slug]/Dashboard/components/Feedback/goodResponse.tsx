"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import { X, ArrowUp } from "lucide-react";
import { toast } from "sonner";

interface GoodResponseProps {
  onClose?: () => void;
}

const OTHER_TAG_LABEL = "Others";

const POSITIVE_TAGS = [
  "Up to date",
  "Clear explanation",
  "Actionable",
  "Helpful context",
  "Accurate data",
  OTHER_TAG_LABEL,
];

export function GoodResponse({ onClose }: GoodResponseProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [showCustomOnly, setShowCustomOnly] = useState(false);
  const canSubmit = notes.trim().length > 0;

  const handleNotesChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(event.target.value);
  };

  const toggleTag = (label: string) => {
    if (label === OTHER_TAG_LABEL) {
      setShowCustomOnly(true);
      setSelectedTags([OTHER_TAG_LABEL]);
      return;
    }

    setSelectedTags((prev) =>
      prev.includes(label)
        ? prev.filter((tag) => tag !== label)
        : [...prev, label]
    );
    toast.success("Thanks for the feedback!", {
      style: {
        border: "1px solid var(--Sonner-Themes-Succes-color, #008A2E)",
      },
    });
    if (onClose) {
      setTimeout(() => onClose(), 1000);
    }
  };

  const showCustomTextarea = showCustomOnly || selectedTags.includes(OTHER_TAG_LABEL);

  const handleSubmit = () => {
    if (!canSubmit) return;
    setNotes("");
    setShowCustomOnly(false);
    setSelectedTags([]);
    toast.success("Thanks for the feedback!", {
      style: {
        border: "1px solid var(--Sonner-Themes-Succes-color, #008A2E)",
      },
    });
    onClose?.();
  };

  return (
    <div className="w-full max-w-[600px] rounded-[12px] border border-[#E4E4E7] bg-white px-6 py-5 dark:border-[#3F3F46] dark:bg-[#09090B]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="text-[12px] text-[#A1A1AA] dark:text-white">
          What did you like about this response? <span className="text-[#A1A1AA]">(Optional)</span>
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="Close positive feedback"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {!showCustomOnly && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {POSITIVE_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                aria-pressed={isSelected}
                className={`flex h-8 items-center justify-center rounded-md border px-4 text-xs font-medium transition  focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer ${
                  isSelected
                    ? "border-[#D91D69] text-[#D91D69]"
                    : "border-[#E4E4E7] text-gray-700 dark:border-[#3F3F46] dark:bg-[#09090B] dark:text-gray-100"
                }`}
                style={{ gap: "8px" }}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}
      {showCustomTextarea && (
        <div className="mt-4 flex flex-col gap-3 max-w-[600px] w-full">
          <div className="relative w-full">
            <textarea
              className="h-[72px] w-full resize-none rounded-lg border border-[#E4E4E7] bg-transparent px-4 py-3 pr-12 text-sm text-gray-900 placeholder:text-gray-400 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D91D69] dark:border-[#3F3F46] dark:text-white"
              placeholder="Add any other details (optional)"
              value={notes}
              onChange={handleNotesChange}
            />
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className={`absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition ${
                canSubmit
                  ? "bg-[#D91D69] text-white hover:bg-[#b81655]"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
              aria-label="Submit additional feedback"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


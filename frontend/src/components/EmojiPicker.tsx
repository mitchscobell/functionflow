import { useState, useRef, useEffect } from "react";

/** Categorized emoji groups displayed in the picker grid. */
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Folders",
    emojis: ["📋", "📁", "📂", "🗂️", "📌", "📎", "🏷️", "🔖"],
  },
  {
    label: "Work",
    emojis: [
      "💼",
      "🏢",
      "💻",
      "⌨️",
      "🖥️",
      "📊",
      "📈",
      "📉",
      "📧",
      "📝",
      "✏️",
      "🔧",
      "⚙️",
      "🛠️",
      "🔬",
      "🧪",
    ],
  },
  {
    label: "Home",
    emojis: ["🏠", "🏡", "🛒", "🧹", "🍳", "🛏️", "🧺", "🪴"],
  },
  {
    label: "People",
    emojis: ["👤", "👥", "👨‍💻", "👩‍💻", "🧑‍🎓", "👶", "🐾", "❤️"],
  },
  {
    label: "Fun",
    emojis: [
      "🚀",
      "⭐",
      "🎯",
      "🎮",
      "🎨",
      "🎵",
      "🎬",
      "📸",
      "✈️",
      "🏖️",
      "⛰️",
      "🏃",
      "🧘",
      "🎾",
      "⚽",
      "🏀",
    ],
  },
  {
    label: "Nature",
    emojis: ["🌱", "🌿", "🌸", "🌻", "🍀", "🌈", "☀️", "🌙"],
  },
  {
    label: "Food",
    emojis: ["☕", "🍕", "🍔", "🎂", "🍎", "🥑", "🍜", "🍩"],
  },
  {
    label: "Symbols",
    emojis: [
      "✅",
      "❌",
      "⚡",
      "🔥",
      "💡",
      "💎",
      "🎁",
      "🏆",
      "🔒",
      "🔑",
      "💰",
      "📅",
      "⏰",
      "🔔",
      "💬",
      "🚩",
    ],
  },
];

/** Props for the {@link EmojiPicker} component. */
interface EmojiPickerProps {
  /** Callback invoked with the selected emoji character. */
  onSelect: (emoji: string) => void;

  /** Callback to close the picker dropdown. */
  onClose: () => void;
}

/**
 * Dropdown emoji picker with categorized groups and a search filter.
 * Closes automatically when the user clicks outside the component.
 */
export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const filtered = search
    ? EMOJI_GROUPS.map((g) => ({
        ...g,
        emojis: g.emojis.filter(() =>
          g.label.toLowerCase().includes(search.toLowerCase()),
        ),
      })).filter((g) => g.emojis.length > 0)
    : EMOJI_GROUPS;

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-1 z-50 w-64 rounded-lg border border-[var(--border)] bg-[var(--bg)] shadow-lg"
    >
      <div className="p-2 border-b border-[var(--border)]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search category..."
          className="w-full rounded border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          autoFocus
        />
      </div>
      <div className="max-h-48 overflow-y-auto p-2 space-y-2">
        {filtered.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">
              {group.label}
            </p>
            <div className="grid grid-cols-8 gap-0.5">
              {group.emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSelect(emoji);
                    onClose();
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--hover)] transition-colors text-base"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-[var(--muted)] text-center py-2">
            No matching emojis
          </p>
        )}
      </div>
    </div>
  );
}

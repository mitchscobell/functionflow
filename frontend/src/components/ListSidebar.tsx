import type { TaskList } from "../types";
import EmojiPicker from "./EmojiPicker";
import { Inbox, Trash2, Pencil, FolderPlus } from "lucide-react";

interface ListSidebarProps {
  lists: TaskList[];
  activeListId: number | null;
  onSelectList: (id: number | null) => void;
  onRenameList: (id: number) => void;
  onDeleteList: (id: number) => void;
  onUpdateEmoji: (id: number, emoji: string) => void;
  onCreateList: () => void;
  editingList: number | null;
  editListName: string;
  onEditListChange: (name: string) => void;
  onStartEditing: (id: number, name: string) => void;
  onStopEditing: () => void;
  emojiPickerListId: number | null;
  onToggleEmojiPicker: (id: number | null) => void;
  newListName: string;
  onNewListNameChange: (name: string) => void;
}

/** Sidebar that displays task lists with rename, emoji, and delete controls. */
export default function ListSidebar({
  lists,
  activeListId,
  onSelectList,
  onRenameList,
  onDeleteList,
  onUpdateEmoji,
  onCreateList,
  editingList,
  editListName,
  onEditListChange,
  onStartEditing,
  onStopEditing,
  emojiPickerListId,
  onToggleEmojiPicker,
  newListName,
  onNewListNameChange,
}: ListSidebarProps) {
  return (
    <aside className="hidden md:block w-52 shrink-0 print:hidden">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">
        Lists
      </h2>
      <nav className="space-y-0.5">
        <button
          onClick={() => onSelectList(null)}
          className={`flex items-center gap-2 w-full rounded-lg px-3 py-1.5 text-sm transition-colors ${
            activeListId === null ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--hover)]"
          }`}
        >
          <Inbox size={14} />
          All Tasks
        </button>
        {lists.map((list) => (
          <div
            key={list.id}
            className={`group flex items-center ${emojiPickerListId === list.id ? "relative z-50" : ""}`}
          >
            {editingList === list.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onRenameList(list.id);
                }}
                className="flex-1 flex gap-1"
              >
                <input
                  value={editListName}
                  onChange={(e) => onEditListChange(e.target.value)}
                  className="flex-1 rounded border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1 text-xs"
                  autoFocus
                  onBlur={onStopEditing}
                />
              </form>
            ) : (
              <button
                onClick={() => onSelectList(list.id)}
                className={`flex items-center gap-2 flex-1 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  activeListId === list.id
                    ? "bg-[var(--accent)] text-white"
                    : "hover:bg-[var(--hover)]"
                }`}
              >
                <span
                  className="relative cursor-pointer hover:scale-125 transition-transform"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleEmojiPicker(emojiPickerListId === list.id ? null : list.id);
                  }}
                  title="Change emoji"
                >
                  {list.emoji || "📋"}
                  {emojiPickerListId === list.id && (
                    <div className="absolute top-6 left-0 z-50">
                      <EmojiPicker
                        onSelect={(emoji) => {
                          onUpdateEmoji(list.id, emoji);
                          onToggleEmojiPicker(null);
                        }}
                        onClose={() => onToggleEmojiPicker(null)}
                      />
                    </div>
                  )}
                </span>
                <span className="truncate flex-1 text-left">{list.name}</span>
                <span className="text-xs opacity-60">{list.taskCount}</span>
              </button>
            )}
            <button
              onClick={() => onStartEditing(list.id, list.name)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--hover)] rounded transition-all"
              title="Rename"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => onDeleteList(list.id)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--hover)] rounded text-red-500 transition-all"
              title="Delete list"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </nav>
      <div className="mt-3 flex gap-1">
        <input
          value={newListName}
          onChange={(e) => onNewListNameChange(e.target.value)}
          placeholder="New list..."
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1 text-xs"
          onKeyDown={(e) => e.key === "Enter" && onCreateList()}
        />
        <button
          onClick={onCreateList}
          className="rounded-lg p-1 hover:bg-[var(--hover)] transition-colors text-[var(--accent)]"
          title="Create list"
        >
          <FolderPlus size={16} />
        </button>
      </div>
    </aside>
  );
}

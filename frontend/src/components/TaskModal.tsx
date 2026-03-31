import { useState, useEffect } from "react";
import type { Task, TaskList } from "../types";
import { X, FolderPlus, Smile } from "lucide-react";
import EmojiPicker from "./EmojiPicker";

/** Props for the {@link TaskModal} component. */
interface Props {
  /** Existing task to edit, or null/undefined when creating a new task. */
  task?: Task | null;

  /** Whether the modal is currently visible. */
  open: boolean;

  /** Callback to close the modal. */
  onClose: () => void;

  /** Callback invoked with the form data when the user submits. */
  onSave: (data: Partial<Task>) => void;

  /** Available task lists for the list assignment dropdown. */
  lists?: TaskList[];

  /** Pre-selected list ID for new tasks created from a list view. */
  activeListId?: number | null;

  /** Callback to create a new list inline. Returns the new list. */
  onCreateList?: (name: string, emoji?: string) => Promise<TaskList | undefined>;
}

/**
 * Modal dialog for creating or editing a task.
 * Pre-populates form fields when editing an existing task.
 */
export default function TaskModal({
  task,
  open,
  onClose,
  onSave,
  lists = [],
  activeListId,
  onCreateList,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [url, setUrl] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [status, setStatus] = useState<"Todo" | "InProgress" | "Done">("Todo");
  const [dueDate, setDueDate] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [listId, setListId] = useState<number | undefined>(undefined);
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListEmoji, setNewListEmoji] = useState("");
  const [showNewListEmojiPicker, setShowNewListEmojiPicker] = useState(false);

  // Sync form fields when the modal opens with an existing task or resets for a new one.
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setNotes(task.notes || "");
      setUrl(task.url || "");
      setPriority(task.priority);
      setStatus(task.status);
      setDueDate(task.dueDate ? task.dueDate.split("T")[0] : "");
      setTagsInput(task.tags.join(", "));
      setListId(task.listId);
    } else {
      setTitle("");
      setDescription("");
      setNotes("");
      setUrl("");
      setPriority("Medium");
      setStatus("Todo");
      setDueDate("");
      setTagsInput("");
      setListId(activeListId ?? undefined);
    }
  }, [task, open, activeListId]);

  if (!open) return null;

  /**
   * Collects form state, normalizes tags, and passes the data to {@link Props.onSave}.
   * @param e - Form submission event.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    onSave({
      title,
      description: description || undefined,
      notes: notes || undefined,
      url: url || undefined,
      priority,
      status: task ? status : undefined,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      tags,
      listId: listId ?? undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold">{task ? "Edit Task" : "New Task"}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-[var(--hover)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="What needs to be done?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
              placeholder="Add details..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={10000}
              rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-y"
              placeholder="Checklists, extra details, reminders..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              type="url"
              maxLength={2048}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "Low" | "Medium" | "High")}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            {task && (
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "Todo" | "InProgress" | "Done")}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  <option value="Todo">To Do</option>
                  <option value="InProgress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tags</label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="work, personal, urgent"
            />
            <p className="mt-1 text-xs text-[var(--muted)]">Separate multiple tags with commas.</p>
          </div>

          {(lists.length > 0 || onCreateList) && (
            <div>
              <label className="block text-sm font-medium mb-1">List</label>
              {!creatingList ? (
                <div className="flex gap-2">
                  <select
                    value={listId ?? ""}
                    onChange={(e) => {
                      if (e.target.value === "__new__") {
                        setCreatingList(true);
                      } else {
                        setListId(e.target.value ? Number(e.target.value) : undefined);
                      }
                    }}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  >
                    <option value="">Inbox (no list)</option>
                    {lists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.emoji ? `${l.emoji} ` : ""}
                        {l.name}
                      </option>
                    ))}
                    {onCreateList && <option value="__new__">+ Create new list...</option>}
                  </select>
                </div>
              ) : (
                <div className="flex gap-2 relative">
                  <button
                    type="button"
                    onClick={() => setShowNewListEmojiPicker((v) => !v)}
                    className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-sm hover:bg-[var(--hover)] transition-colors"
                    title="Pick emoji"
                  >
                    {newListEmoji || <Smile size={18} />}
                  </button>
                  {showNewListEmojiPicker && (
                    <div className="absolute top-full left-0 z-50 mt-1">
                      <EmojiPicker
                        onSelect={(emoji) => {
                          setNewListEmoji(emoji);
                          setShowNewListEmojiPicker(false);
                        }}
                        onClose={() => setShowNewListEmojiPicker(false)}
                      />
                    </div>
                  )}
                  <input
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="List name..."
                    maxLength={100}
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    autoFocus
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const name = newListName.trim();
                        if (!name || !onCreateList) return;
                        const created = await onCreateList(name, newListEmoji || undefined);
                        if (created) setListId(created.id);
                        setNewListName("");
                        setNewListEmoji("");
                        setCreatingList(false);
                      } else if (e.key === "Escape") {
                        setNewListName("");
                        setNewListEmoji("");
                        setCreatingList(false);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const name = newListName.trim();
                      if (!name || !onCreateList) return;
                      const created = await onCreateList(name, newListEmoji || undefined);
                      if (created) setListId(created.id);
                      setNewListName("");
                      setNewListEmoji("");
                      setCreatingList(false);
                    }}
                    className="rounded-lg p-2 hover:bg-[var(--hover)] transition-colors text-[var(--accent)]"
                    title="Create list"
                  >
                    <FolderPlus size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewListName("");
                      setNewListEmoji("");
                      setShowNewListEmojiPicker(false);
                      setCreatingList(false);
                    }}
                    className="rounded-lg p-2 hover:bg-[var(--hover)] transition-colors"
                    title="Cancel"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-[var(--hover)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              {task ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

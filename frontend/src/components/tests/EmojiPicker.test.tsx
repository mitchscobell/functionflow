import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EmojiPicker from "../EmojiPicker";

describe("EmojiPicker", () => {
  it("renders search input and emoji groups", () => {
    render(<EmojiPicker onSelect={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByPlaceholderText("Search category...")).toBeInTheDocument();
    expect(screen.getByText("Folders")).toBeInTheDocument();
    expect(screen.getByText("Work")).toBeInTheDocument();
    expect(screen.getByText("Symbols")).toBeInTheDocument();
  });

  it("calls onSelect and onClose when an emoji is clicked", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<EmojiPicker onSelect={onSelect} onClose={onClose} />);

    // Click the first emoji (📋)
    fireEvent.click(screen.getByTitle("📋"));

    expect(onSelect).toHaveBeenCalledWith("📋");
    expect(onClose).toHaveBeenCalled();
  });

  it("filters by category label when searching", () => {
    render(<EmojiPicker onSelect={vi.fn()} onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("Search category..."), {
      target: { value: "food" },
    });

    expect(screen.getByText("Food")).toBeInTheDocument();
    // "Work" group should be hidden since it doesn't match "food"
    expect(screen.queryByText("Work")).not.toBeInTheDocument();
  });

  it("shows 'No matching emojis' when search has no results", () => {
    render(<EmojiPicker onSelect={vi.fn()} onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("Search category..."), {
      target: { value: "zzzznonexistent" },
    });

    expect(screen.getByText("No matching emojis")).toBeInTheDocument();
  });

  it("calls onClose on outside click", () => {
    const onClose = vi.fn();
    render(
      <div data-testid="outside">
        <EmojiPicker onSelect={vi.fn()} onClose={onClose} />
      </div>,
    );

    fireEvent.mouseDown(screen.getByTestId("outside"));

    expect(onClose).toHaveBeenCalled();
  });
});

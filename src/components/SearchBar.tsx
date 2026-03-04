"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  compact?: boolean;
  loading?: boolean;
}

export default function SearchBar({
  onSearch,
  compact = false,
  loading = false,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Auto-focus on mount (non-compact only)
  useEffect(() => {
    if (!compact) inputRef.current?.focus();
  }, [compact]);

  // Click outside to close suggestions
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchSuggestions = useCallback(async (search: string) => {
    if (search.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(search)}&limit=5&format=json&origin=*`;
      const res = await fetch(url);
      const data = await res.json();
      setSuggestions(data[1] ?? []);
      setShowSuggestions(true);
      setActiveIndex(-1);
    } catch {
      setSuggestions([]);
    }
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  }

  function submit(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setShowSuggestions(false);
    setSuggestions([]);
    onSearch(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        const selected = suggestions[activeIndex];
        setQuery(selected);
        submit(selected);
      } else {
        submit(query);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  function selectSuggestion(suggestion: string) {
    setQuery(suggestion);
    submit(suggestion);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={`
          glass flex items-center gap-3 rounded-card shadow-soft
          border border-border transition-all duration-300
          ${compact ? "px-4 py-2.5" : "px-5 py-4"}
        `}
      >
        {/* Search icon */}
        <svg
          width={compact ? 18 : 22}
          height={compact ? 18 : 22}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-light flex-shrink-0"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder="Search any topic..."
          className={`
            flex-1 bg-transparent outline-none placeholder:text-light
            text-foreground
            ${compact ? "text-base" : "text-lg"}
          `}
        />

        {/* Loading spinner */}
        {loading && (
          <svg
            className="animate-spin text-muted flex-shrink-0"
            width={compact ? 18 : 20}
            height={compact ? 18 : 20}
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2.5"
              opacity="0.2"
            />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* Clear button */}
        {query && !loading && (
          <button
            onClick={() => {
              setQuery("");
              setSuggestions([]);
              setShowSuggestions(false);
              inputRef.current?.focus();
            }}
            className="text-light hover:text-muted transition-colors flex-shrink-0"
          >
            <svg
              width={compact ? 16 : 18}
              height={compact ? 16 : 18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 glass rounded-card shadow-soft border border-border overflow-hidden z-50">
          {suggestions.map((suggestion, i) => (
            <button
              key={suggestion}
              onClick={() => selectSuggestion(suggestion)}
              className={`
                w-full text-left px-5 py-3 text-sm transition-colors
                ${i === activeIndex ? "bg-black/[0.04]" : "hover:bg-black/[0.03]"}
              `}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

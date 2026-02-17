'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Search, Clock } from 'lucide-react';
import { searchPosts } from '@/app/search/actions';
import { cn } from '@/lib/utils';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  author: string;
  board: string;
  date: string;
}

const RECENT_SEARCHES_KEY = 'pokerhub_recent_searches';
const MAX_RECENT_SEARCHES = 5;

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load recent searches on mount
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored));
        } catch (e) {
          setRecentSearches([]);
        }
      }
      // Auto-focus input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (query.trim() === '') {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      const searchResults = await searchPosts(query);
      setResults(searchResults);
      setIsSearching(false);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  const addToRecentSearches = (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (trimmed === '') return;

    const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, MAX_RECENT_SEARCHES);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const removeRecentSearch = (searchQuery: string) => {
    const updated = recentSearches.filter(s => s !== searchQuery);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const handleRecentSearchClick = (searchQuery: string) => {
    setQuery(searchQuery);
    addToRecentSearches(searchQuery);
  };

  const handleResultClick = () => {
    addToRecentSearches(query);
    onClose();
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="text-[#c9a227]">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      {/* Mobile Layout */}
      <div className="lg:hidden fixed inset-0 bg-[#121212] flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#333]">
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#a0a0a0] hover:text-[#e0e0e0] transition-colors"
            aria-label="닫기"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a0a0a0]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="검색어를 입력하세요"
              className="w-full pl-10 pr-4 py-2.5 bg-[#2a2a2a] border border-[#333] rounded-lg text-[#e0e0e0] placeholder:text-[#888] focus:outline-none focus:border-[#c9a227] transition-all"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {query.trim() === '' && recentSearches.length > 0 && (
            <div className="p-4">
              <h3 className="text-sm font-medium text-[#a0a0a0] mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                최근 검색어
              </h3>
              <div className="space-y-2">
                {recentSearches.map((recent, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 p-3 bg-[#1e1e1e] rounded-lg hover:bg-[#2a2a2a] transition-colors"
                  >
                    <button
                      onClick={() => handleRecentSearchClick(recent)}
                      className="flex-1 text-left text-[#e0e0e0]"
                    >
                      {recent}
                    </button>
                    <button
                      onClick={() => removeRecentSearch(recent)}
                      className="min-w-[32px] min-h-[32px] flex items-center justify-center text-[#888] hover:text-[#e0e0e0] transition-colors"
                      aria-label="삭제"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {query.trim() !== '' && !isSearching && results.length === 0 && (
            <div className="p-8 text-center text-[#888]">
              검색 결과 없음
            </div>
          )}

          {results.length > 0 && (
            <div className="p-4 space-y-3">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={handleResultClick}
                  className="w-full p-4 bg-[#1e1e1e] rounded-lg hover:bg-[#2a2a2a] transition-all text-left"
                >
                  <h4 className="font-medium text-[#e0e0e0] mb-2">
                    {highlightMatch(result.title, query)}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-[#a0a0a0]">
                    <span>{result.author}</span>
                    <span>•</span>
                    <span>{result.board}</span>
                    <span>•</span>
                    <span>{result.date}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex items-start justify-center pt-24 px-4">
        <div className="w-full max-w-[600px] bg-[#1e1e1e] rounded-lg border border-[#333] shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-[#333]">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a0a0a0]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="검색어를 입력하세요"
                className="w-full pl-10 pr-4 py-2.5 bg-[#2a2a2a] border border-[#333] rounded-lg text-[#e0e0e0] placeholder:text-[#888] focus:outline-none focus:border-[#c9a227] transition-all"
              />
            </div>
            <button
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center text-[#a0a0a0] hover:text-[#e0e0e0] transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[500px] overflow-y-auto">
            {query.trim() === '' && recentSearches.length > 0 && (
              <div className="p-4">
                <h3 className="text-sm font-medium text-[#a0a0a0] mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  최근 검색어
                </h3>
                <div className="space-y-2">
                  {recentSearches.map((recent, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-3 bg-[#121212] rounded-lg hover:bg-[#2a2a2a] transition-colors"
                    >
                      <button
                        onClick={() => handleRecentSearchClick(recent)}
                        className="flex-1 text-left text-[#e0e0e0]"
                      >
                        {recent}
                      </button>
                      <button
                        onClick={() => removeRecentSearch(recent)}
                        className="min-w-[32px] min-h-[32px] flex items-center justify-center text-[#888] hover:text-[#e0e0e0] transition-colors"
                        aria-label="삭제"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {query.trim() !== '' && !isSearching && results.length === 0 && (
              <div className="p-8 text-center text-[#888]">
                검색 결과 없음
              </div>
            )}

            {results.length > 0 && (
              <div className="p-4 space-y-3">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={handleResultClick}
                    className="w-full p-4 bg-[#121212] rounded-lg hover:bg-[#2a2a2a] transition-all text-left"
                  >
                    <h4 className="font-medium text-[#e0e0e0] mb-2">
                      {highlightMatch(result.title, query)}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-[#a0a0a0]">
                      <span>{result.author}</span>
                      <span>•</span>
                      <span>{result.board}</span>
                      <span>•</span>
                      <span>{result.date}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer Hint */}
          <div className="p-3 border-t border-[#333] text-center text-xs text-[#888]">
            Esc로 닫기
          </div>
        </div>
      </div>
    </div>
  );
}

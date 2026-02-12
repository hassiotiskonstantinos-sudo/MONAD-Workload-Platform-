'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import Link from 'next/link';

interface SearchResult {
  id: string;
  type: string;
  title?: string;
  name?: string;
  status?: string;
}

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    tasks: SearchResult[];
    projects: SearchResult[];
    deliverables: SearchResult[];
  } | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setOpen(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const totalResults =
    (results?.tasks.length || 0) +
    (results?.projects.length || 0) +
    (results?.deliverables.length || 0);

  return (
    <div ref={ref} className="relative w-96">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search tasks, projects, deliverables..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results && setOpen(true)}
          className="input pl-9 pr-8"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults(null); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && results && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden z-50">
          {totalResults === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500">No results found</p>
          ) : (
            <>
              {results.projects.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase bg-gray-50">Projects</p>
                  {results.projects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-2 text-sm hover:bg-gray-50"
                    >
                      {p.name}
                    </Link>
                  ))}
                </div>
              )}
              {results.tasks.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase bg-gray-50">Tasks</p>
                  {results.tasks.map((t) => (
                    <Link
                      key={t.id}
                      href={`/tasks`}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-2 text-sm hover:bg-gray-50"
                    >
                      {t.title}
                    </Link>
                  ))}
                </div>
              )}
              {results.deliverables.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase bg-gray-50">Deliverables</p>
                  {results.deliverables.map((d) => (
                    <Link
                      key={d.id}
                      href={`/deliverables`}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-2 text-sm hover:bg-gray-50"
                    >
                      {d.name}
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

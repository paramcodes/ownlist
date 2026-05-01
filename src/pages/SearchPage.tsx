import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import Layout from "@/components/Layout";
import MovieCard from "@/components/MovieCard";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Film } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: autocompleteResults } = trpc.movie.autocomplete.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 && showAutocomplete && !selectedMovie }
  );

  const { data: searchResults, isLoading } = trpc.movie.search.useQuery(
    { query: debouncedQuery, page: 1 },
    { enabled: debouncedQuery.length >= 1 }
  );

  const addMovie = trpc.movie.getOrCreate.useMutation();
  const utils = trpc.useUtils();

  const toggleLike = trpc.interaction.toggleLike.useMutation({
    onSuccess: () => utils.invalidate(),
  });
  const toggleWatch = trpc.interaction.toggleWatched.useMutation({
    onSuccess: () => utils.invalidate(),
  });
  const toggleWant = trpc.interaction.toggleWantToWatch.useMutation({
    onSuccess: () => utils.invalidate(),
  });

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    async (item: any) => {
      setShowAutocomplete(false);
      setSelectedMovie(item);
      await addMovie.mutateAsync({ tmdbId: item.tmdbId });
      setSearchParams({ q: item.title });
      setSelectedMovie(null);
    },
    [addMovie, setSearchParams]
  );

  const results = searchResults?.results || [];

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto mb-10"
          ref={containerRef}
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search movies, TV shows, anime..."
              className="h-14 pl-12 pr-12 text-lg bg-card border-border focus-visible:ring-primary rounded-xl"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowAutocomplete(true);
                setSelectedMovie(null);
              }}
              onFocus={() => setShowAutocomplete(true)}
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setShowAutocomplete(false);
                  inputRef.current?.focus();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            <AnimatePresence>
              {showAutocomplete && autocompleteResults && autocompleteResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute z-50 mt-2 w-full rounded-xl bg-card border border-border shadow-xl overflow-hidden"
                >
                  {autocompleteResults.map((item: { tmdbId: string; title: string; posterPath: string | null; releaseDate: string | null; type: string }) => (
                    <button
                      key={item.tmdbId}
                      onClick={() => handleSelect(item)}
                      className="flex items-center gap-3 w-full px-4 py-3 hover:bg-secondary transition-colors text-left"
                    >
                      {item.posterPath ? (
                        <img src={item.posterPath} alt="" className="h-12 w-8 rounded object-cover" />
                      ) : (
                        <div className="flex h-12 w-8 items-center justify-center rounded bg-secondary">
                          <Film className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.releaseDate ? new Date(item.releaseDate).getFullYear() : ""} · {item.type === "series" ? "Series" : "Movie"}
                        </p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-72 w-full rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          >
            {results.map((movie: any, index: number) => (
              <MovieCard
                key={movie.tmdbId || index}
                movie={movie}
                index={index}
                onLikeToggle={() => {
                  addMovie.mutate({ tmdbId: movie.tmdbId }, {
                    onSuccess: (res) => {
                      toggleLike.mutate({ movieId: res.id });
                    },
                  });
                }}
                onWatchToggle={() => {
                  addMovie.mutate({ tmdbId: movie.tmdbId }, {
                    onSuccess: (res) => {
                      toggleWatch.mutate({ movieId: res.id });
                    },
                  });
                }}
                onWantToggle={() => {
                  addMovie.mutate({ tmdbId: movie.tmdbId }, {
                    onSuccess: (res) => {
                      toggleWant.mutate({ movieId: res.id });
                    },
                  });
                }}
              />
            ))}
          </motion.div>
        )}

        {!isLoading && query.length > 0 && results.length === 0 && (
          <div className="text-center py-16">
            <Film className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium mb-2">No results found</h3>
            <p className="text-muted-foreground">Try a different search term or add a custom movie.</p>
          </div>
        )}

        {!query && (
          <div className="text-center py-16">
            <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium mb-2">Search for movies, series, and anime</h3>
            <p className="text-muted-foreground">Type to search OMDb movies and Jikan anime, then add them to your lists.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

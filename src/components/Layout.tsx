import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Film,
  Search,
  List,
  User,
  LogOut,
  Menu,
  X,
  Home,
  Heart,
  TrendingUp,
  Gamepad2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [isSelectingSuggestion, setIsSelectingSuggestion] = useState(false);
  const containerRef = useRef<HTMLFormElement>(null);
  const mobileContainerRef = useRef<HTMLFormElement>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 250);

  const { data: autocompleteResults } = trpc.movie.autocomplete.useQuery(
    { query: debouncedSearchQuery },
    { enabled: debouncedSearchQuery.length >= 2 && showAutocomplete && !isSelectingSuggestion }
  );
  const addMovie = trpc.movie.getOrCreate.useMutation();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedDesktopSearch = containerRef.current?.contains(target);
      const clickedMobileSearch = mobileContainerRef.current?.contains(target);
      if (!clickedDesktopSearch && !clickedMobileSearch) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowAutocomplete(false);
      setSearchQuery("");
    }
  };

  const typeLabel = (type?: string) => {
    if (type === "series") return "Series";
    if (type === "anime") return "Anime";
    if (type === "game") return "Game";
    return "Movie";
  };

  const handleSuggestionSelect = async (item: { tmdbId: string }) => {
    setIsSelectingSuggestion(true);
    setShowAutocomplete(false);
    try {
      const created = await addMovie.mutateAsync({ tmdbId: item.tmdbId });
      setMobileMenuOpen(false);
      navigate(`/movie/${created.id}`);
      setSearchQuery("");
    } finally {
      setIsSelectingSuggestion(false);
    }
  };

  const navLinks = [
    { path: "/", label: "Home", icon: Home },
    { path: "/lists", label: "Lists", icon: List },
    { path: "/games", label: "Games", icon: Gamepad2 },
    { path: "/trending", label: "Trending", icon: TrendingUp },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Film className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">OwnList</span>
          </Link>

          <form onSubmit={handleSearch} className="hidden sm:flex flex-1 max-w-md mx-4" ref={containerRef}>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search movies, series, anime, games..."
                className="w-full pl-10 bg-secondary/50 border-border focus-visible:ring-primary"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowAutocomplete(true);
                  setIsSelectingSuggestion(false);
                }}
                onFocus={() => setShowAutocomplete(true)}
              />

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
                        type="button"
                        onClick={() => handleSuggestionSelect(item)}
                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-secondary transition-colors text-left"
                      >
                        {item.posterPath ? (
                          <img src={item.posterPath} alt="" className="h-10 w-7 rounded object-cover" />
                        ) : (
                          <div className="flex h-10 w-7 items-center justify-center rounded bg-secondary">
                            <Film className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.releaseDate ? new Date(item.releaseDate).getFullYear() : ""} · {typeLabel(item.type)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>

          <div className="hidden md:flex items-center gap-1 ml-auto">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
          </div>

          <div className="ml-auto md:ml-0 flex items-center gap-2">
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name || "User"}
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-primary">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center gap-2 p-2">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name || "User"}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{user.name || "User"}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(`/profile`)}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/lists`)}>
                    <List className="mr-2 h-4 w-4" />
                    My Lists
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/liked`)}>
                    <Heart className="mr-2 h-4 w-4" />
                    Liked
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate("/login")}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Sign In
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-border overflow-hidden"
            >
              <div className="px-4 py-3 space-y-2">
                <form onSubmit={handleSearch} className="sm:hidden mb-2" ref={mobileContainerRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      className="w-full pl-10 bg-secondary/50"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowAutocomplete(true);
                        setIsSelectingSuggestion(false);
                      }}
                      onFocus={() => setShowAutocomplete(true)}
                    />

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
                              type="button"
                              onClick={() => handleSuggestionSelect(item)}
                              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-secondary transition-colors text-left"
                            >
                              {item.posterPath ? (
                                <img src={item.posterPath} alt="" className="h-10 w-7 rounded object-cover" />
                              ) : (
                                <div className="flex h-10 w-7 items-center justify-center rounded bg-secondary">
                                  <Film className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{item.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.releaseDate ? new Date(item.releaseDate).getFullYear() : ""} · {typeLabel(item.type)}
                                </p>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </form>
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive(link.path)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main>{children}</main>
    </div>
  );
}

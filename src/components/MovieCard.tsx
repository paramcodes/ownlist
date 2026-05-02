import { Link } from "react-router";
import { motion } from "framer-motion";
import { Heart, Eye, Bookmark, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Movie {
  id: number;
  title: string;
  overview?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string | null;
  type?: string;
  voteAverage?: string | number | null;
}

interface MovieCardProps {
  movie: Movie;
  index?: number;
  liked?: boolean;
  watched?: boolean;
  wantToWatch?: boolean;
  rating?: number;
  onLikeToggle?: (movieId: number) => void;
  onWatchToggle?: (movieId: number) => void;
  onWantToggle?: (movieId: number) => void;
  onCardClick?: (movie: Movie) => void;
  showActions?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-32 sm:w-36",
  md: "w-40 sm:w-48",
  lg: "w-48 sm:w-56",
};

const imageHeights = {
  sm: "h-48 sm:h-52",
  md: "h-56 sm:h-64",
  lg: "h-64 sm:h-72",
};

export default function MovieCard({
  movie,
  index = 0,
  liked = false,
  watched = false,
  wantToWatch = false,
  rating = 0,
  onLikeToggle,
  onWatchToggle,
  onWantToggle,
  onCardClick,
  showActions = true,
  size = "md",
}: MovieCardProps) {
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const typeLabel = movie.type === "series" ? "Series" : movie.type === "anime" ? "Anime" : movie.type === "game" ? "Game" : "Movie";

  const handleClick = (e: React.MouseEvent) => {
    if (onCardClick) {
      e.preventDefault();
      onCardClick(movie);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ scale: 1.03, y: -4 }}
      className={`group relative flex-shrink-0 ${sizeClasses[size]}`}
    >
      <Link to={`/movie/${movie.id}`} onClick={handleClick} className="block">
        <div className={`relative overflow-hidden rounded-xl bg-card ${imageHeights[size]}`}>
          {movie.posterPath ? (
            <img
              src={movie.posterPath}
              alt={movie.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary">
              <span className="text-muted-foreground text-sm">No Image</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          {movie.voteAverage && Number(movie.voteAverage) > 0 && (
            <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-medium text-white">{Number(movie.voteAverage).toFixed(1)}</span>
            </div>
          )}
          <Badge variant="secondary" className="absolute top-2 left-2 text-[10px] bg-black/60 text-white border-none backdrop-blur-sm">
            {typeLabel}
          </Badge>
        </div>
      </Link>

      {showActions && (
        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          {onLikeToggle && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onLikeToggle(movie.id);
              }}
              className={`flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm transition-colors ${
                liked ? "bg-primary text-white" : "bg-black/60 text-white hover:bg-primary/80"
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} />
            </button>
          )}
          {onWatchToggle && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onWatchToggle(movie.id);
              }}
              className={`flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm transition-colors ${
                watched ? "bg-green-500 text-white" : "bg-black/60 text-white hover:bg-green-500/80"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          )}
          {onWantToggle && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onWantToggle(movie.id);
              }}
              className={`flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm transition-colors ${
                wantToWatch ? "bg-blue-500 text-white" : "bg-black/60 text-white hover:bg-blue-500/80"
              }`}
            >
              <Bookmark className={`h-3.5 w-3.5 ${wantToWatch ? "fill-current" : ""}`} />
            </button>
          )}
        </div>
      )}

      <div className="mt-2">
        <h3 className="text-sm font-semibold line-clamp-1 text-foreground">{movie.title}</h3>
        <div className="flex items-center gap-2 mt-0.5">
          {year ? <span className="text-xs text-muted-foreground">{year}</span> : null}
          {rating > 0 && (
            <div className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs text-muted-foreground">{rating}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

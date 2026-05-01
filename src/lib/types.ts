import type { Activity, List, LocalUser, Movie, User, UserMovie } from "@db/schema";

export type AuthUser = User | LocalUser;

export type MovieCardMovie = Pick<
  Movie,
  "id" | "title" | "overview" | "posterPath" | "backdropPath" | "releaseDate" | "type" | "voteAverage"
>;

export type MovieWithUserMovie = {
  movie: MovieCardMovie;
  userMovie: UserMovie;
};

export type ListItem = List;

export type ActivityFeedItem = Activity & {
  movie?: MovieCardMovie | null;
};

export type TrendingMovie = MovieCardMovie;

export type AutocompleteMovie = {
  tmdbId: string;
  title: string;
  posterPath: string | null;
  releaseDate: string;
  type: "movie" | "series" | "anime";
};

export type TmdbSearchMovie = {
  tmdbId: string;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string;
  type: "movie" | "series" | "anime";
  popularity: number;
  voteAverage: number;
  voteCount: number;
  genre: string;
};

export type ProfileStats = {
  liked: number;
  watched: number;
  wantToWatch: number;
  rated: number;
  lists: number;
  followers: number;
  following: number;
};

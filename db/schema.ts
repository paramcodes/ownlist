export interface LocalUser {
  id?: number;
  _id?: string;
  email: string;
  passwordHash: string;
  name?: string;
  avatar?: string;
  bio?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id?: number;
  _id?: string;
  unionId?: string;
  name?: string;
  email?: string;
  avatar?: string;
  bio?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
  lastSignInAt?: string;
}

export interface Movie {
  id?: number;
  _id?: string;
  tmdbId?: string;
  title: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  releaseDate?: string;
  type?: string;
  popularity?: string;
  voteAverage?: string;
  voteCount?: number;
  genre?: string;
  isCustom?: boolean;
  createdAt?: string;
}

export interface UserMovie {
  id?: number;
  _id?: string;
  userId: string | number;
  userType?: string;
  movieId: string | number;
  liked?: boolean;
  watched?: boolean;
  wantToWatch?: boolean;
  rating?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface List {
  id?: number;
  _id?: string;
  userId: string | number;
  userType?: string;
  name: string;
  description?: string;
  type?: string;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListItem {
  id?: number;
  _id?: string;
  listId: string | number;
  movieId: string | number;
  createdAt?: string;
}

export interface Follow {
  id?: number;
  _id?: string;
  followerId: string | number;
  followerType?: string;
  followingId: string | number;
  followingType?: string;
  createdAt?: string;
}

export interface Activity {
  id?: number;
  _id?: string;
  userId: string | number;
  userType?: string;
  userName?: string;
  userAvatar?: string;
  action: string;
  movieId?: string | number;
  movieTitle?: string;
  moviePoster?: string;
  targetUserId?: string | number;
  targetUserName?: string;
  rating?: number;
  createdAt?: string;
}

// Collection names for MongoDB
export const COLLECTIONS = {
  users: "users",
  localUsers: "local_users",
  movies: "movies",
  userMovies: "user_movies",
  lists: "lists",
  listItems: "list_items",
  follows: "follows",
  activities: "activities",
} as const;

export const users = {
  id: "_id",
  unionId: "unionId",
  name: "name",
  email: "email",
  avatar: "avatar",
  bio: "bio",
  role: "role",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  lastSignInAt: "lastSignInAt",
};

export const localUsers = {
  id: "_id",
  email: "email",
  passwordHash: "passwordHash",
  name: "name",
  avatar: "avatar",
  bio: "bio",
  role: "role",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

export const movies = {
  id: "_id",
  tmdbId: "tmdbId",
  title: "title",
  overview: "overview",
  posterPath: "posterPath",
  backdropPath: "backdropPath",
  releaseDate: "releaseDate",
  type: "type",
  popularity: "popularity",
  voteAverage: "voteAverage",
  voteCount: "voteCount",
  genre: "genre",
  isCustom: "isCustom",
  createdAt: "createdAt",
};

export const userMovies = {
  id: "_id",
  userId: "userId",
  userType: "userType",
  movieId: "movieId",
  liked: "liked",
  watched: "watched",
  wantToWatch: "wantToWatch",
  rating: "rating",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

export const lists = {
  id: "_id",
  userId: "userId",
  userType: "userType",
  name: "name",
  description: "description",
  type: "type",
  isPublic: "isPublic",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

export const listItems = {
  id: "_id",
  listId: "listId",
  movieId: "movieId",
  createdAt: "createdAt",
};

export const follows = {
  id: "_id",
  followerId: "followerId",
  followerType: "followerType",
  followingId: "followingId",
  followingType: "followingType",
  createdAt: "createdAt",
};

export const activities = {
  id: "_id",
  userId: "userId",
  userType: "userType",
  userName: "userName",
  userAvatar: "userAvatar",
  action: "action",
  movieId: "movieId",
  movieTitle: "movieTitle",
  moviePoster: "moviePoster",
  targetUserId: "targetUserId",
  targetUserName: "targetUserName",
  rating: "rating",
  createdAt: "createdAt",
};

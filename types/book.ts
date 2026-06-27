export interface AppBook {
  id: string;
  title: string;
  author: string;
  cover: string;
  rating: number;
  ratingCount: number;
  genre: string;
  description: string;
  pages: number;
  year: number;
  language: string;
  isVip?: boolean;
  isFeatured?: boolean;
  isBestseller?: boolean;
  isNew?: boolean;
  readingTime: string;
}

export type SeriesMetadata = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  image?: string;
  status: 'planned' | 'in-progress' | 'completed';
  startDate?: string;
  endDate?: string;
  summary: string;
  draft?: boolean;
  fileName?: string;
};

export type SeriesWithPosts = SeriesMetadata & {
  posts: {
    slug: string;
    title: string;
    date: string;
    summary?: string;
    tags?: string[];
    order: number;
  }[];
  postCount: number;
};

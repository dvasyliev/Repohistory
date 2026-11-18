export interface Repo {
  id: number;
  name: string;
  full_name: string;
  stargazers_count: number;
  forks_count: number;
  pushed_at: string | null;
  description: string | null;
}

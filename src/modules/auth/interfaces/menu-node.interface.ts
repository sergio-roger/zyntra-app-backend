export interface MenuNode {
  id: string;
  key: string;
  label: string;
  path: string;
  parent_key: string | null;
  access_level?: string;
  children: MenuNode[];
}

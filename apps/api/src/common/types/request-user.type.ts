export type RequestUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor';
};

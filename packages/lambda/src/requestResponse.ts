export type Request = {
  path?: string;
  method: string;
  headers?: Record<string, string>;
  body?: string | undefined;
};

export type Response = {
  status: number;
  headers: Record<string, string>;
  body: string | undefined;
};

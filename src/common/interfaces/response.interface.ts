export interface ResponseFormat<T> {
  success: boolean;
  path: string;
  timestamp: string;
  data: T;
}

export interface ErrorResponseFormat {
  success: false;
  statusCode: number;
  path: string;
  timestamp: string;
  message: string | string[];
}

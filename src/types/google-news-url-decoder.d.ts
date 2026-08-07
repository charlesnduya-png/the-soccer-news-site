declare module "google-news-url-decoder" {
  export type GoogleDecodeResult = {
    status: boolean;
    decoded_url?: string;
    message?: string;
  };

  export class GoogleDecoder {
    decode(url: string): Promise<GoogleDecodeResult>;
    decodeBatch(urls: string[]): Promise<GoogleDecodeResult[]>;
  }
}

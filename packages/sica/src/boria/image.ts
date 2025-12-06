import { Boria } from "./types";

export type DataContent = string | Uint8Array | ArrayBuffer | Buffer;

export function Image<const Image extends DataContent | URL, const MediaType>(
  image: Image,
  mediaType?: MediaType
): MediaType extends string
  ? Boria.Part<{
      type: "image";
      image: Image;
      mediaType: MediaType;
    }>
  : Boria.Part<{
      type: "image";
      image: Image;
    }> {
  return {} as never;
}

import { Boria } from "./types";

export type DataContent = string | Uint8Array | ArrayBuffer | Buffer;

export function Image<const Image extends DataContent | URL, const MediaType>(
  image: Image,
  mediaType?: MediaType
): MediaType extends string
  ? Boria.MessagePart<{
      type: "image";
      image: Image;
      mediaType: MediaType;
    }>
  : Boria.MessagePart<{
      type: "image";
      image: Image;
    }>;

export function Image<
  const Class extends string[],
  const Image extends DataContent | URL,
  const MediaType,
>(
  cls: Class,
  image: Image,
  mediaType?: MediaType
): MediaType extends string
  ? Boria.MessagePart<{
      type: "image";
      cls: Class;
      image: Image;
      mediaType: MediaType;
    }>
  : Boria.MessagePart<{
      type: "image";
      cls: Class;
      image: Image;
    }>;

export function Image(...args: any) {
  return {} as never;
}

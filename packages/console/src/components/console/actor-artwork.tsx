import { Blobatar } from "blobatar/react";

type ActorArtworkProps = {
  name: string;
  className?: string;
};

export default function ActorArtwork({
  name,
  className = "h-[60px] w-[60px]",
}: ActorArtworkProps) {
  return (
    <Blobatar
      className={className}
      name={name}
      animate="always"
      background={false}
      aria-hidden="true"
    />
  );
}

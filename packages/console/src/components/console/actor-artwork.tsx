import { Blobatar } from "blobatar/react";

type ActorArtworkProps = {
  name: string;
  className?: string;
};

export default function ActorArtwork({
  name,
  className = "h-[40px] w-[40px]",
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

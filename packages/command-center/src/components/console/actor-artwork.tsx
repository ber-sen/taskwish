type ActorArtworkProps = {
  color: string;
  className?: string;
};

export default function ActorArtwork({
  color,
  className = "h-[30px] w-[30px]",
}: ActorArtworkProps) {
  return (
    <svg
      className={className}
      style={{ color }}
      viewBox="0 0 204 142"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M148 0C178.928 0 204 25.0721 204 56C204 76.3835 193.109 94.2224 176.829 104.018L177 104C154.833 116.107 126.6 130.122 117 137.322C107.4 144.522 103 140.322 102 137.322V112H56C25.0721 112 0 86.9279 0 56C0 25.0721 25.0721 1.4818e-06 56 0H148ZM56.5 35C44.6259 35 35 44.6259 35 56.5C35 68.3741 44.6259 78 56.5 78C68.3741 78 78 68.3741 78 56.5C78 44.6259 68.3741 35 56.5 35ZM143.5 35C131.626 35 122 44.6259 122 56.5C122 68.3741 131.626 78 143.5 78C155.374 78 165 68.3741 165 56.5C165 44.6259 155.374 35 143.5 35Z"
        fill="currentColor"
      />
    </svg>
  );
}

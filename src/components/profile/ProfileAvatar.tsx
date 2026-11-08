import { useEffect, useState } from 'react';
import { getInitials } from '../../profile';

export default function ProfileAvatar({
  name,
  avatar,
  className = 'h-9 w-9',
  textClassName = 'text-[11px]',
}: {
  name: string;
  avatar: string | null;
  className?: string;
  textClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [avatar]);

  if (avatar && !failed) {
    return (
      <img
        src={avatar}
        alt=""
        aria-hidden
        onError={() => setFailed(true)}
        className={`rounded-full object-cover shadow-sm ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`grid place-items-center rounded-full bg-gradient-to-br from-brand to-[#b69cff] font-extrabold text-white shadow-sm ${className} ${textClassName}`}
    >
      {getInitials(name)}
    </span>
  );
}

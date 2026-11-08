export default function JourneyIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 190"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="246" cy="36" r="22" fill="#F6C445" />
      <g fill="#FFF9EA">
        <ellipse cx="64" cy="42" rx="25" ry="9" />
        <ellipse cx="86" cy="36" rx="14" ry="7" />
        <ellipse cx="206" cy="58" rx="17" ry="6" />
      </g>

      <path d="M0 150C40 124 80 122 122 139C164 156 206 160 300 124V190H0V150Z" fill="#F7DA92" />
      <path d="M0 172C56 151 104 157 152 175C200 193 252 183 300 166V190H0V172Z" fill="#F1C867" />
      <path d="M0 190V178C58 164 102 170 146 184C190 198 248 190 300 176V190H0Z" fill="#EAB94F" opacity=".55" />

      <path
        d="M168 190C176 165 202 154 224 141C242 130 256 120 264 106"
        stroke="#FFF8E6"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M168 190C176 165 202 154 224 141C242 130 256 120 264 106"
        stroke="#E6B247"
        strokeWidth="2"
        strokeDasharray="2 8"
        strokeLinecap="round"
      />

      <g transform="translate(252 84)">
        <path d="M8 24V0" stroke="#6B4719" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M9 2L27 8L9 14V2Z" fill="#F58A65" />
        <circle cx="8" cy="25" r="2.5" fill="#6B4719" />
      </g>

      <g transform="translate(188 120)">
        <circle cx="12" cy="6" r="7" fill="#3B2A6B" />
        <path d="M12 13C9 21 9 29 11 37" stroke="#7A45F0" strokeWidth="12" strokeLinecap="round" />
        <path d="M9 37L3 53M12 37L20 51" stroke="#2F2A4A" strokeWidth="6" strokeLinecap="round" />
        <path d="M7 19L-2 27M16 21L25 29" stroke="#7A45F0" strokeWidth="5" strokeLinecap="round" />
        <rect x="14" y="15" width="12" height="15" rx="4" fill="#F58A65" />
        <path d="M20 18V27" stroke="#D96A47" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      <g transform="translate(22 138)">
        <rect x="0" y="28" width="58" height="10" rx="3" fill="#7A45F0" />
        <rect x="4" y="18" width="54" height="10" rx="3" fill="#4CC9E0" />
        <rect x="2" y="8" width="50" height="10" rx="3" fill="#F58A65" />
        <path d="M12 8V0" stroke="#8A5A1F" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 2C6 2 4-4 7-8C13-8 15-2 12 2Z" fill="#7A45F0" opacity=".75" />
      </g>

      <g transform="translate(280 160)">
        <path d="M6 22V5" stroke="#8A5A1F" strokeWidth="2" strokeLinecap="round" />
        <path d="M6 12C-1 12 -3 4 1 0C7 0 9 6 6 12Z" fill="#7A45F0" opacity=".8" />
        <path d="M6 16C13 16 15 8 11 4C5 4 3 10 6 16Z" fill="#4CC9E0" opacity=".8" />
      </g>

      <g transform="translate(108 56) rotate(-12)">
        <path d="M0 8L26 0L14 20L10 11L0 8Z" fill="#FFF8E6" stroke="#E6B247" strokeWidth="1.2" />
      </g>

      <circle cx="36" cy="82" r="3" fill="#F58A65" opacity=".55" />
      <circle cx="222" cy="28" r="2.5" fill="#7A45F0" opacity=".35" />
      <circle cx="132" cy="32" r="2" fill="#4CC9E0" opacity=".55" />
    </svg>
  );
}

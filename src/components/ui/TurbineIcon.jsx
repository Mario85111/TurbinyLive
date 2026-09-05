// Ikona turbiny wiatrowej: wieża + wirnik z 3 łukowymi łopatami (pinwheel).
// Wirnik lekko przekrzywiony, by sylwetka czytała się jako wiatrak, a nie samolot.
// Pogrubione kształty dla dobrej widoczności w małych rozmiarach (favicon).
// API zgodne z lucide-react: size, className.
export default function TurbineIcon({ size = 24, className = '', ...rest }) {
  const blade = 'M12 9.5 C 10.2 6.4, 10.6 2.8, 12.4 1.2 C 13.7 3.4, 13.4 6.6, 12 9.5 Z'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {/* wieża (zwężająca się ku górze) */}
      <path d="M11.2 9.6 L12.8 9.6 L13.6 22 L10.4 22 Z" />
      {/* wirnik: 3 łopaty co 120°, cała grupa przekrzywiona o 20° */}
      <g transform="rotate(20 12 9.5)">
        <path d={blade} />
        <path d={blade} transform="rotate(120 12 9.5)" />
        <path d={blade} transform="rotate(240 12 9.5)" />
      </g>
      {/* piasta */}
      <circle cx="12" cy="9.5" r="1.9" />
    </svg>
  )
}

import * as React from "react"

const PokeCommunityIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  color = "currentColor",
  ...props
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlSpace="preserve"
    style={{
      fillRule: "evenodd",
      clipRule: "evenodd",
      strokeLinejoin: "round",
      strokeMiterlimit: 2,
    }}
    viewBox="0 0 128 128"
    {...props}
  >
    <path
      d="M0 0h128v128H0z"
      style={{
        fill: "none",
      }}
    />
    <path
      d="M34.632 112H127l-15-19.875V68H89.5v9.524c0 6.61-5.366 11.976-11.976 11.976H50.476c-6.61 0-11.976-5.366-11.976-11.976V68H16v25.368C16 103.651 24.349 112 34.632 112ZM16 60h22.5v-9.524c0-6.61 5.366-11.976 11.976-11.976h27.048c6.61 0 11.976 5.366 11.976 11.976V60H112V34.632C112 24.349 103.651 16 93.368 16H34.632C24.349 16 16 24.349 16 34.632V60Z"
      style={{
        fill: color,
      }}
    />
    <path
      d="M81.5 54.376a7.88 7.88 0 0 0-7.876-7.876H54.376a7.88 7.88 0 0 0-7.876 7.876v19.248a7.88 7.88 0 0 0 7.876 7.876h19.248a7.88 7.88 0 0 0 7.876-7.876V54.376Z"
      style={{
        fill: color,
      }}
    />
  </svg>
)
export default PokeCommunityIcon

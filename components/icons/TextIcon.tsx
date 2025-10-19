
import React from 'react';

const TextIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M17 6.1H7" />
    <path d="M21 12.1H3" />
    <path d="M15 18.1H9" />
    <path d="M12 21.1V3.1" />
  </svg>
);

export default TextIcon;

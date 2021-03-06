const size = {
  esmall: '576px',
  small: '576px',
  medium: '768px',
  large: '992px',
  elarge: '1200px'
};

export const extraSmallDevices = `@media only screen and (max-width: ${size.esmall})`;
export const smallDevices = `@media only screen and (min-width: ${size.small})`;
export const mediumDevices = `@media only screen and (min-width: ${size.medium})`;
export const largeDevices = `@media only screen and (min-width: ${size.large})`;
export const extraLargeDevices = `@media only screen and (min-width: ${size.elarge})`;

export const lessThan768px = `@media only screen and (max-width: ${size.medium})`;

/* @media only screen and (max-width: 768px) {
  } */

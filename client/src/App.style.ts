import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap');

  * {
    box-sizing: border-box;
  };

  *:focus {
  outline: none;
  };

  html {
    position: relative;
    min-height: 100%;
    overflow-y: scroll;
  }; 

  body {
    margin: 0;
    padding: 0;
    font-family: 'Roboto', sans-serif;
    background-color: #FAFAFA;
  };
`;

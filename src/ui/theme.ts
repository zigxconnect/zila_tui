import chalk from "chalk";
import figures from "figures";

export const theme = {
  colors: {
    primary: "#5CC8FF",      
    secondary: "#FFB454",    

    // Status colors
    success: "#7EE787",      
    successDim: "#2EA043",

    warning: "#E3B341",      
    error: "#FF7B72",        
    info: "#79C0FF",         

    // Neutral text
    white: "#F0F6FC",        
    text: "#C9D1D9",         
    muted: "#8B949E",        
    dim: "#6E7681",          

    // UI surfaces
    border: "#30363D",       
    panel: "#161B22",        
    highlight: "#1F6FEB",    

    // Special-purpose
    danger: "#F85149",
    link: "#58A6FF",
    accent: "#BC8CFF",       
  },
  symbols: {
    pointer: figures.pointer,
    success: figures.tick,
    warning: figures.warning,
    error: figures.cross,
    info: figures.info,
    bullet: figures.bullet,
    line: figures.line,
  },
  timing: {
    splashStagger: 100,
    exitDelay: 600,
  },
};

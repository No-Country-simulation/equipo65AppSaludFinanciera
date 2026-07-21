import React, { createContext, useContext, useState } from 'react';
// Asegúrate de que la ruta apunte correctamente a donde dejaste tus temas
import { TemaClaro, TemaOscuro } from '../constants/tema'; 

// 1. Definimos el "contrato" de nuestro contexto
interface ThemeContextType {
  esModoOscuro: boolean;
  toggleTema: () => void;
  // Añadimos el símbolo " | " (OR) para aceptar cualquiera de los dos temas
  temaActivo: typeof TemaClaro | typeof TemaOscuro; 
}
// 2. Creamos el Contexto vacío
const ThemeContext = createContext<ThemeContextType>({
  esModoOscuro: true, 
  toggleTema: () => {},
  temaActivo: TemaOscuro,
});

// 3. El Provider que va a envolver a toda nuestra aplicación
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // Aquí vive el estado real. Lo iniciamos en true para que arranque en modo oscuro
  const [esModoOscuro, setEsModoOscuro] = useState(true);

  // La función que ejecutará nuestro futuro botón
  const toggleTema = () => {
    setEsModoOscuro((estadoAnterior) => !estadoAnterior);
  };

  // Evaluamos qué colores mandar dependiendo del estado
  const temaActivo = esModoOscuro ? TemaOscuro : TemaClaro;

  return (
    <ThemeContext.Provider value={{ esModoOscuro, toggleTema, temaActivo }}>
      {children}
    </ThemeContext.Provider>
  );
};

// 4. Un Hook personalizado para no tener que importar useContext en cada archivo
export const useTheme = () => useContext(ThemeContext);
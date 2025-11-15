// src/context/AuthContext.jsx

import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; // Importamos la herramienta

// 1. Creamos el Contexto
const AuthContext = createContext();

// 2. Creamos el "Proveedor" (el componente que envuelve la app)
export function AuthProvider({ children }) {
  // Guardamos el token y el usuario en el estado
  // Intentamos leer el token del "localStorage" por si ya estábamos logueados
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [user, setUser] = useState(null);

  // Este efecto se ejecuta cada vez que el token cambia (o al cargar la app)
  useEffect(() => {
    if (token) {
      try {
        // Decodificamos el token para sacar los datos del usuario
        const decodedUser = jwtDecode(token);
        setUser(decodedUser); // Guardamos { sub: "email@...", id: 4, rol: "admin", ... }
        // Guardamos el token en el localStorage para recordar la sesión
        localStorage.setItem('authToken', token);
      } catch (error) {
        // Si el token es inválido o expiró
        console.error("Error decodificando el token", error);
        setUser(null);
        localStorage.removeItem('authToken');
      }
    } else {
      // Si no hay token, borramos todo
      setUser(null);
      localStorage.removeItem('authToken');
    }
  }, [token]); // Se vuelve a ejecutar si 'token' cambia

  // Función para Iniciar Sesión
  const login = (newToken) => {
    setToken(newToken);
  };

  // Función para Cerrar Sesión
  const logout = () => {
    setToken(null);
  };

  // El "valor" que compartiremos con toda la app
  const value = {
    token,
    user,
    login,
    logout,
  };

  // 3. Regresamos el proveedor
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 4. Creamos el "Hook" (el atajo para usar el contexto)
// En lugar de importar useContext y AuthContext en cada archivo,
// solo importaremos useAuth()
export const useAuth = () => {
  return useContext(AuthContext);
};
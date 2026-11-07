import { useState } from "react";
import "./App.css";

const FILAS = 10;
const COLUMNAS = 10;

function App() {
  // Matriz IIT: 0 = libre, 1 = obstaculo
  const [grid, setGrid] = useState(
    Array(FILAS)
      .fill()
      .map(() => Array(COLUMNAS).fill(0)),
  );

  // Coordenadas: [fila, columna]
  const [inicio, setInicio] = useState([0, 0]);
  const [meta, setMeta] = useState([9, 9]);
  const [ruta, setRuta] = useState([]);

  // poner/quitar paredes con clic
  const toggleObstaculo = (f, c) => {
    // Evitar poner paredes sobre el inicio o la meta
    if (
      (f === inicio[0] && c === inicio[1]) ||
      (f === meta[0] && c === meta[1])
    )
      return;

    const nuevoGrid = [...grid];
    nuevoGrid[f][c] = nuevoGrid[f][c] === 0 ? 1 : 0;
    setGrid(nuevoGrid);
    setRuta([]); // Limpiar la ruta anterior si cambian los pasillos
  };

  // backend
  const calcularRuta = async () => {
    try {
      const respuesta = await fetch("http://127.0.0.1:8000/calcular-ruta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grid, inicio, meta }),
      });
      const datos = await respuesta.json();

      if (datos.ruta && datos.ruta.length > 0) {
        setRuta(datos.ruta);
      } else {
        alert("¡No hay ruta posible! El pasillo está completamente bloqueado.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error conectando a Python. ¿Sigue corriendo uvicorn?");
    }
  };

  // Verifica si una celda forma parte de la ruta final
  const esParteDeRuta = (f, c) => {
    return ruta.some((coord) => coord[0] === f && coord[1] === c);
  };

  return (
    <div className="contenedor">
      <h1>Operación Dulce 🍬 - IIT</h1>
      <p>
        Haz clic en los cuadros para bloquear pasillos (simulando alumnos,
        charcos o mantenimiento).
      </p>

      <div className="tablero">
        {grid.map((fila, f) => (
          <div key={f} className="fila">
            {fila.map((celda, c) => {
              let clases = "celda ";
              if (f === inicio[0] && c === inicio[1]) clases += "inicio";
              else if (f === meta[0] && c === meta[1]) clases += "meta";
              else if (celda === 1) clases += "obstaculo";
              else if (esParteDeRuta(f, c)) clases += "ruta";

              return (
                <div
                  key={`${f}-${c}`}
                  className={clases}
                  onClick={() => toggleObstaculo(f, c)}
                >
                  {f === inicio[0] && c === inicio[1] && "👨‍🏫"}
                  {f === meta[0] && c === meta[1] && "🍬"}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <button onClick={calcularRuta} className="btn-calcular">
        Encontrar Ruta A*
      </button>
    </div>
  );
}

export default App;

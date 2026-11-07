from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import heapq

app = FastAPI()

# CORS para que React pueda comunicarse con Python sin errores
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En producción se restringe, pero para desarrollo está bien
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Estructura de los datos que React nos va a enviar
class DatosMapa(BaseModel):
    grid: list[list[int]]
    inicio: list[int]
    meta: list[int]

# Distancia Manhattan
def distancia_manhattan(origen, destino):
    return abs(origen[0] - destino[0]) + abs(origen[1] - destino[1])

# Algoritmo A*
def algoritmo_a_star(grid, inicio, meta):
    filas = len(grid)
    columnas = len(grid[0])
    
    open_set = []
    heapq.heappush(open_set, (0, tuple(inicio)))
    came_from = {}
    g_score = {tuple(inicio): 0}
    f_score = {tuple(inicio): distancia_manhattan(inicio, meta)}
    
    while open_set:
        current = heapq.heappop(open_set)[1]
        
        if list(current) == meta:
            ruta = []
            while current in came_from:
                ruta.append(list(current))
                current = came_from[current]
            ruta.append(inicio)
            return ruta[::-1]
            
        vecinos = [
            (current[0] - 1, current[1]), # Arriba
            (current[0] + 1, current[1]), # Abajo
            (current[0], current[1] - 1), # Izquierda
            (current[0], current[1] + 1)  # Derecha
        ]
        
        for v in vecinos:
            if 0 <= v[0] < filas and 0 <= v[1] < columnas:
                if grid[v[0]][v[1]] == 1: # Si es obstáculo, lo ignoramos
                    continue
                    
                tentative_g_score = g_score[current] + 1
                
                if v not in g_score or tentative_g_score < g_score[v]:
                    came_from[v] = current
                    g_score[v] = tentative_g_score
                    f_score[v] = tentative_g_score + distancia_manhattan(v, meta)
                    
                    if not any(v == item[1] for item in open_set):
                        heapq.heappush(open_set, (f_score[v], v))
                        
    return [] # Retorna lista vacia si no hay ruta

# Endpoint que React va a consumir
@app.post("/calcular-ruta")
def calcular_ruta(datos: DatosMapa):
    ruta_optima = algoritmo_a_star(datos.grid, datos.inicio, datos.meta)
    return {"ruta": ruta_optima}
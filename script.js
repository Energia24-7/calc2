const PVWATTS_API_KEY = 'wgXhSAQTTg1UHYaxZ5P4KneLK6IUgs3Cd9JsdWF8'; // Reemplaza con tu API Key
let userLat = null;
let userLon = null;

// Evento para confirmar la ubicación
document.getElementById("confirmarUbicacion").addEventListener("click", function() {
    const ubicacionSeleccionada = document.getElementById("ubicacion").value;
    
    if (ubicacionSeleccionada === "actual") {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                userLat = position.coords.latitude;
                userLon = position.coords.longitude;
                document.getElementById("ubicacionSeleccionada").innerText = `Ubicación detectada: ${userLat.toFixed(4)}, ${userLon.toFixed(4)}`;
                document.getElementById("calcularBtn").disabled = false;
            }, () => {
                alert("No se pudo obtener la ubicación actual.");
            });
        } else {
            alert("La geolocalización no es soportada por este navegador.");
        }
    } else {
        [userLat, userLon] = ubicacionSeleccionada.split(",").map(Number);
        document.getElementById("ubicacionSeleccionada").innerText = `Ubicación seleccionada: ${userLat}, ${userLon}`;
        document.getElementById("calcularBtn").disabled = false;
    }
});

// Evento para calcular capacidad
document.getElementById("calcularBtn").addEventListener("click", async function() {
    const consumo = parseFloat(document.getElementById("consumo").value);
    if (!consumo || !userLat || !userLon) {
        alert("Por favor, ingresa el consumo y confirma la ubicación.");
        return;
    }
    
    document.getElementById("resultado").innerText = "Calculando, por favor espera...";
    limpiarTabla();
    const capacidad = await findBestCapacity(userLat, userLon, consumo, PVWATTS_API_KEY);
    if (capacidad !== null) {
        document.getElementById("resultado").innerText = `Capacidad recomendada: ${capacidad.toFixed(2)} kW`;
    } else {
        document.getElementById("resultado").innerText = "Error en la consulta a PVWatts. Verifica los parámetros o la clave API.";
    }
});

// Función para buscar la mejor capacidad de paneles
async function findBestCapacity(lat, lon, consumoMensual, apiKey) {
    let capacity = 0.5;
    const maxCapacity = 20;
    let bestCapacity = null;
    
    while (capacity <= maxCapacity) {
        const url = `https://developer.nrel.gov/api/pvwatts/v6.json?api_key=${apiKey}&lat=${lat}&lon=${lon}&system_capacity=${capacity}&module_type=0&array_type=1&tilt=20&azimuth=180&losses=14`;
        console.log("Consultando API PVWatts:", url); // Depuración
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error("Error 404: No se encontraron datos para la ubicación seleccionada.");
                } else {
                    throw new Error(`Error ${response.status}: No se pudo conectar con la API de PVWatts.`);
                }
            }
            
            const data = await response.json();
            if (data.outputs && data.outputs.ac_annual) {
                const monthlyGen = data.outputs.ac_annual / 12;
                agregarFilaTabla(capacity, monthlyGen);
                
                if (monthlyGen*1.05 >= consumoMensual) {
                    bestCapacity = capacity;
                    break;
                }
            } else {
                throw new Error("La API no devolvió datos válidos. Revisa los parámetros.");
            }
        } catch (error) {
            console.error(error.message);
            alert(error.message);
            return null;
        }
        
        capacity += 0.5;
    }
    return bestCapacity;
}


// Función para limpiar la tabla antes de generar nuevos datos
function limpiarTabla() {
    document.querySelector("#tablaResultados tbody").innerHTML = "";
}

// Función para agregar una fila a la tabla
function agregarFilaTabla(capacidad, generacion) {
    const tabla = document.querySelector("#tablaResultados tbody");
    const fila = document.createElement("tr");
    fila.innerHTML = `<td>${capacidad} kW</td><td>${generacion.toFixed(2)} kWh</td>`;
    tabla.appendChild(fila);
}

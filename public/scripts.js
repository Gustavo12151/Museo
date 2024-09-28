// ========================== CONFIGURACIÓN INICIAL ==========================

// URL base de la API del MET
const baseUrl = "https://collectionapi.metmuseum.org/public/collection/v1";

// Variables para la paginación y procesamiento por bloques
let currentPage = 1;
const itemsPerPage = 20; // Mostrar un máximo de 20 objetos por página
let allFilteredObjectIDs = [];

// ======================== FUNCIONES PARA OBTENER DATOS ========================

// Función para obtener departamentos desde la API
function obtenerDepartamentos() {
    fetch(`${baseUrl}/departments`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error al obtener los departamentos: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const departmentSelect = document.getElementById('departmentSelect');
            // Limpiar el selector antes de agregar nuevos elementos
            departmentSelect.innerHTML = '<option value="">Todos los departamentos</option>';

            // Añadir las opciones de departamentos al select
            for (let i = 0; i < data.departments.length; i++) {
                const department = data.departments[i];
                const option = document.createElement('option');
                option.value = department.departmentId;
                option.text = department.displayName;
                departmentSelect.appendChild(option);
            }
        })
        .catch(error => {
            console.error("Error al cargar los departamentos:", error);
        });
}

// Función para obtener objetos basados en filtros seleccionados/////////////////
// Función para filtrar objetos basados en múltiples criterios///////////////////
// Función para filtrar objetos basados en múltiples criterios
function obtenerObjetosConFiltros(departmentId, keyword, countryKeyword) {
    // Inicializar la lista de IDs de objetos filtrados
    allFilteredObjectIDs = []; // Reiniciar la lista de IDs filtrados
    currentPage = 1; // Resetear a la primera página

    const promises = []; // Array para almacenar las promesas

    // Obtener objetos por departamento si se seleccionó
    if (departmentId) {
        promises.push(obtenerObjetosPorDepartamento(departmentId));
    }

    // Buscar por palabra clave si se proporcionó
    if (keyword) {
        promises.push(buscarPorPalabraClave(keyword));
    }

    // Buscar por país si se proporcionó
    if (countryKeyword) {
        promises.push(buscarPorPais(countryKeyword));
    }

    // Esperar a que todas las promesas se completen
    Promise.all(promises)
        .then(results => {
            // Si no hay resultados, no hay que filtrar más
            if (results.length === 0 || results.some(result => result.length === 0)) {
                mostrarObjetos(); // Mostrar objetos vacíos
                return;
            }

            // Comenzar con el primer resultado o un array vacío
            allFilteredObjectIDs = results[0]; 

            // Filtrar acumulativamente según los resultados
            results.forEach((result, index) => {
                if (index > 0 && result.length > 0) { // Solo filtrar si no es el primer resultado
                    allFilteredObjectIDs = allFilteredObjectIDs.filter(id => result.includes(id));
                }
            });

            mostrarObjetos(); // Mostrar objetos filtrados
        })
        .catch(error => {
            console.error("Hubo un problema con las solicitudes:", error);
        });
}

// Función para obtener objetos de un departamento específico
function obtenerObjetosPorDepartamento(departmentId) {
    return fetch(`${baseUrl}/objects?departmentIds=${departmentId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error en la solicitud: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Obtener todos los objetos del departamento
            return data.objectIDs || []; // Retornar los IDs
        })
        .catch(error => {
            console.error("Hubo un problema con la solicitud fetch:", error);
            return []; // Retornar un array vacío en caso de error
        });
}

// Función para buscar objetos por palabra clave en el título
function buscarPorPalabraClave(keyword) {
    return fetch(`${baseUrl}/search?q=${encodeURIComponent(keyword)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error en la solicitud: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const objectIDs = data.objectIDs || [];
            const detallesPromesas = objectIDs.map(objectID => obtenerDetallesObjeto(objectID));

            return Promise.all(detallesPromesas).then(detallesObjetos => {
                return detallesObjetos
                    .filter(detalles => 
                        detalles && detalles.title && 
                        detalles.title.toLowerCase().includes(keyword.toLowerCase())
                    )
                    .map(detalles => detalles.objectID); // Retornar los IDs filtrados
            });
        })
        .catch(error => {
            console.error("Hubo un problema con la solicitud fetch:", error);
            return []; // Retornar un array vacío en caso de error
        });
}

// Función para buscar objetos por país
function buscarPorPais(keyword) {
    return fetch(`${baseUrl}/search?hasImages=true`) // Puedes ajustar el endpoint según tus necesidades
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error en la solicitud: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const objectIDs = data.objectIDs || [];
            const detallesPromesas = objectIDs.map(objectID => obtenerDetallesObjeto(objectID));

            return Promise.all(detallesPromesas).then(detallesObjetos => {
                return detallesObjetos
                    .filter(detalles => 
                        detalles && 
                        detalles.country && 
                        detalles.country.toLowerCase() === keyword.toLowerCase()
                    )
                    .map(detalles => detalles.objectID); // Retornar los IDs filtrados
            });
        })
        .catch(error => {
            console.error("Hubo un problema con la solicitud fetch:", error);
            return []; // Retornar un array vacío en caso de error
        });
}



// Función para obtener detalles de un objeto específico
function obtenerDetallesObjeto(objectID) {
    return fetch(`${baseUrl}/objects/${objectID}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error en la solicitud: ${response.status}`);
            }
            return response.json();
        })
        .catch(error => {
            console.error("Hubo un problema al obtener los detalles del objeto:", error);
            return null;
        });
}

// ===================== FUNCIONES DE MOSTRAR Y PAGINAR ======================

// Función para mostrar los objetos con paginación
function mostrarObjetos() {
    const objetosLista = document.getElementById('objetosLista');
    objetosLista.innerHTML = ''; // Limpiar la lista antes de agregar nuevos elementos

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentObjectIDs = allFilteredObjectIDs.slice(startIndex, endIndex);

    if (currentObjectIDs.length === 0) {
        objetosLista.innerHTML = '<li>No se encontraron objetos con los filtros seleccionados.</li>';
        return;
    }

    // Asegurar que las imágenes se filtren y se muestren correctamente
    const promises = currentObjectIDs.map(objectID => obtenerDetallesObjeto(objectID));

    Promise.all(promises).then(resultados => {
        for (let i = 0; i < resultados.length; i++) {
            const detallesObjeto = resultados[i];
            if (!detallesObjeto) continue; // Ignorar si no se obtuvieron detalles del objeto
            
            const listItem = document.createElement('li');
            listItem.classList.add('card');

            listItem.innerHTML = `
                <h3>${detallesObjeto.title}</h3>
                <p><strong>Cultura:</strong> ${detallesObjeto.culture || 'N/A'}</p>
                <p><strong>Dinastía:</strong> ${detallesObjeto.dynasty || 'N/A'}</p>
                <img src="${detallesObjeto.primaryImage || 'sin_imagen.jpg'}" alt="${detallesObjeto.title}">
            `;

            // Verificar si hay imágenes adicionales
            if (detallesObjeto.additionalImages && detallesObjeto.additionalImages.length > 0) {
                const button = document.createElement('button');
                button.classList.add('view-images-button');
                button.textContent = 'Ver más imágenes';
                button.onclick = () => {
                    mostrarImagenesAdicionales(detallesObjeto.additionalImages);
                };
                listItem.appendChild(button);
            }

            objetosLista.appendChild(listItem);
        }

        // Actualizar estado de los botones de paginación
        actualizarEstadoBotones();
    });
}

// ====================== FUNCIONES DE PAGINACIÓN =========================

// Función para actualizar el estado de los botones de paginación
function actualizarEstadoBotones() {
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const totalPages = Math.ceil(allFilteredObjectIDs.length / itemsPerPage);

    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;

    // Mostrar la paginación actual
    const paginationInfo = document.getElementById('paginationInfo');
    paginationInfo.textContent = `Página ${currentPage} de ${totalPages}`;
}

// ==================== FUNCIONES DE IMÁGENES ADICIONALES ====================

// Función para mostrar imágenes adicionales en una nueva página
function mostrarImagenesAdicionales(imagenes) {
    const nuevaVentana = window.open('', '_blank');
    nuevaVentana.document.write('<html><head><title>Imágenes adicionales</title></head><body>');
    
    for (let i = 0; i < imagenes.length; i++) {
        const imagen = imagenes[i];
        nuevaVentana.document.write(`<h3>Imagen ${i + 1}</h3><img src="${imagen}" style="max-width:100%;"><br><br>`);
    }
    
    nuevaVentana.document.write('</body></html>');
    nuevaVentana.document.close();
}

// ====================== MANEJO DE EVENTOS ===========================

// Manejo de eventos de los botones de paginación
document.getElementById('prevButton').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        const keyword = document.getElementById('keywordInput').value;
        mostrarObjetos(keyword);
    }
});

document.getElementById('nextButton').addEventListener('click', () => {
    const totalPages = Math.ceil(allFilteredObjectIDs.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        const keyword = document.getElementById('keywordInput').value;
        mostrarObjetos(keyword);
    }
});

// Evento del botón para aplicar filtros y obtener los objetos
document.getElementById('fetchButton').addEventListener('click', () => {
    const departmentId = document.getElementById('departmentSelect').value; // Obtener ID del departamento
    const keyword = document.getElementById('keywordInput').value; // Obtener palabra clave
    const countryKeyword = document.getElementById('locationInput').value; // Obtener localización

    // Llamar a la función que busca objetos con los filtros seleccionados
    obtenerObjetosConFiltros(departmentId, keyword, countryKeyword);
});

// Cargar departamentos y objetos por defecto al abrir la página
window.onload = () => {
    obtenerDepartamentos();
};



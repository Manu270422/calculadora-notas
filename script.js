// Espera a que todo el contenido del HTML esté cargado antes de ejecutar el script.
document.addEventListener('DOMContentLoaded', () => {

    // ==========================================================================
    // 1. SELECCIÓN DE ELEMENTOS DEL DOM
    // ==========================================================================
    const modoToggleBtn = document.getElementById('modo-toggle');
    const toggleInstruccionesBtn = document.getElementById('toggleInstrucciones');
    const bloqueInstrucciones = document.getElementById('bloqueInstrucciones');

    const calcularFinalBtn = document.getElementById('calcular-final-btn');
    const limpiarTodoBtn = document.getElementById('limpiar-todo-btn');
    const estimarFinalBtn = document.getElementById('estimar-final-btn');

    const imprimirBtn = document.getElementById('imprimir-btn');
    const exportarPdfBtn = document.getElementById('exportar-pdf-btn');
    const exportarExcelBtn = document.getElementById('exportar-excel-btn');

    const PESO_CORTES = { 1: 0.30, 2: 0.30, 3: 0.40 };

    const customModal = document.getElementById('custom-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalInput = document.getElementById('modal-input');
    const modalOkBtn = document.getElementById('modal-ok-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');

    let resolveModalPromise;

    // ==========================================================================
    // 2. FUNCIONES DE MODAL
    // ==========================================================================

    function showAlert(title, message) {
        return new Promise(resolve => {
            modalTitle.textContent = title;
            modalMessage.textContent = message;
            modalInput.classList.add('hidden');
            modalOkBtn.classList.remove('hidden');
            modalCancelBtn.classList.add('hidden');

            modalOkBtn.onclick = () => {
                customModal.classList.remove('visible');
                resolve(true);
            };

            customModal.classList.add('visible');
            reproducirClic();
        });
    }

    function showConfirm(title, message) {
        return new Promise(resolve => {
            modalTitle.textContent = title;
            modalMessage.textContent = message;
            modalInput.classList.add('hidden');
            modalOkBtn.classList.remove('hidden');
            modalCancelBtn.classList.remove('hidden');

            modalOkBtn.onclick = () => {
                customModal.classList.remove('visible');
                resolve(true);
            };
            modalCancelBtn.onclick = () => {
                customModal.classList.remove('visible');
                resolve(false);
            };

            customModal.classList.add('visible');
            reproducirClic();
        });
    }

    function showPrompt(title, message, defaultValue = "") {
        return new Promise(resolve => {
            modalTitle.textContent = title;
            modalMessage.textContent = message;
            modalInput.value = defaultValue;
            modalInput.classList.remove('hidden');
            modalOkBtn.classList.remove('hidden');
            modalCancelBtn.classList.remove('hidden');

            modalOkBtn.onclick = () => {
                const value = parseFloat(modalInput.value);
                customModal.classList.remove('visible');
                resolve(isNaN(value) ? null : value);
            };
            modalCancelBtn.onclick = () => {
                customModal.classList.remove('visible');
                resolve(null);
            };

            customModal.classList.add('visible');
            modalInput.focus();
            reproducirClic();
        });
    }

    // ==========================================================================
    // 3. EVENTOS
    // ==========================================================================

    function bindEvents() {
        modoToggleBtn.addEventListener('click', toggleModo);
        toggleInstruccionesBtn.addEventListener('click', () => {
            bloqueInstrucciones.classList.toggle('ocultar');
            reproducirClic();
        });

        calcularFinalBtn.addEventListener('click', () => {
            calcularNotaFinal();
            reproducirClic();
        });

        limpiarTodoBtn.addEventListener('click', async () => {
            const confirmed = await showConfirm("⚠️ Confirmar", "¿Estás seguro de que quieres borrar todos los datos? Esta acción no se puede deshacer.");
            if (confirmed) limpiarTodo();
            reproducirClic();
        });

        estimarFinalBtn.addEventListener('click', async () => {
            const meta = await showPrompt("🎯 Estimar Nota Final", "¿Qué nota final deseas alcanzar (mínimo 0.0, máximo 5.0)?", "3.0");
            if (meta !== null && !isNaN(meta) && meta >= 0 && meta <= 5) {
                estimarNotaFinal(meta);
            } else if (meta !== null) {
                showAlert("❌ Error", "Por favor, ingresa una nota válida entre 0.0 y 5.0.");
            }
            reproducirClic();
        });

        imprimirBtn.addEventListener('click', () => {
            window.print();
            reproducirClic();
        });

        exportarPdfBtn.addEventListener('click', () => {
            exportarPDF();
            reproducirClic();
        });

        exportarExcelBtn.addEventListener('click', () => {
            exportarExcel();
            reproducirClic();
        });

        for (let i = 1; i <= 3; i++) {
            document.getElementById(`calcular-corte-${i}-btn`).addEventListener('click', () => {
                calcularCorte(i);
                reproducirClic();
            });

            document.getElementById(`estimar-corte-${i}-btn`).addEventListener('click', async () => {
                const meta = await showPrompt(`🎯 Estimar Nota Corte ${i}`, `¿Qué nota deseas alcanzar en el corte ${i} (mínimo 0.0, máximo 5.0)?`, "3.0");
                if (meta !== null && !isNaN(meta) && meta >= 0 && meta <= 5) {
                    estimarNotaFaltante(i, meta);
                } else if (meta !== null) {
                    showAlert("❌ Error", "Por favor, ingresa una nota válida entre 0.0 y 5.0.");
                }
                reproducirClic();
            });

            document.getElementById(`usar-manual-${i}-btn`).addEventListener('click', () => {
                usarNotaManual(i);
                reproducirClic();
            });
        }

        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', () => {
                actualizarColorInput(input);
                guardarDatos();
            });
        });
    }

    // ==========================================================================
    // 4. CÁLCULOS
    // ==========================================================================

    function calcularCorte(numeroCorte) {
        const inputs = document.querySelectorAll(`.corte${numeroCorte}`);
        let sumaPonderada = 0;
        let porcentajeSumado = 0;

        inputs.forEach(input => {
            const nota = parseFloat(input.value);
            const porcentaje = parseFloat(input.dataset.porcentaje);
            if (!isNaN(nota) && nota >= 0 && nota <= 5) {
                sumaPonderada += nota * (porcentaje / 100);
                porcentajeSumado += porcentaje;
            }
        });

        const notaCorte = porcentajeSumado > 0 ? (sumaPonderada / (porcentajeSumado / 100)) : 0;
        document.getElementById(`totalCorte${numeroCorte}`).textContent = notaCorte.toFixed(2);
        actualizarBarra(`barraCorte${numeroCorte}`, notaCorte);

        const totalCorteRow = document.getElementById(`row-total-corte-${numeroCorte}`);
        if (totalCorteRow) actualizarColorfila(totalCorteRow, notaCorte);
    }

    function usarNotaManual(numeroCorte) {
        const inputManual = document.getElementById(`manualCorte${numeroCorte}`);
        const nota = parseFloat(inputManual.value);

        if (isNaN(nota) || nota < 0 || nota > 5) {
            showAlert("❌ Nota Inválida", "Ingresa una nota válida entre 0 y 5.");
            return;
        }

        document.getElementById(`totalCorte${numeroCorte}`).textContent = nota.toFixed(2);
        actualizarBarra(`barraCorte${numeroCorte}`, nota);
        const totalCorteRow = document.getElementById(`row-total-corte-${numeroCorte}`);
        if (totalCorteRow) actualizarColorfila(totalCorteRow, nota);
    }

    function calcularNotaFinal() {
        let notaFinalAcumulada = 0;
        let todosLosCortesLlenos = true;

        for (let i = 1; i <= 3; i++) {
            const notaCorte = parseFloat(document.getElementById(`totalCorte${i}`).textContent);
            if (!isNaN(notaCorte)) {
                notaFinalAcumulada += notaCorte * PESO_CORTES[i];
            } else {
                todosLosCortesLlenos = false;
            }
        }

        if (!todosLosCortesLlenos) {
            showAlert("⚠️ Cortes Incompletos", "Para calcular la nota final, asegúrate de que todos los totales de los cortes estén calculados o ingresados manualmente.");
            document.getElementById('notaFinal').textContent = "-";
            actualizarBarra('barraFinal', 0);
            actualizarColorMetaFinal(0);
            return;
        }

        document.getElementById('notaFinal').textContent = notaFinalAcumulada.toFixed(2);
        actualizarBarra('barraFinal', notaFinalAcumulada);
        actualizarColorMetaFinal(notaFinalAcumulada);
    }

    function estimarNotaFaltante(numeroCorte, metaDeseada) {
        const inputs = Array.from(document.querySelectorAll(`.corte${numeroCorte}`));
        const inputsVacios = inputs.filter(input => input.value.trim() === '');

        if (inputsVacios.length !== 1) {
            showAlert("⚠️ Error de Estimación", "Debe haber exactamente UNA casilla vacía para poder estimar en este corte.");
            return;
        }

        let sumaPonderadaExistente = 0;
        let porcentajeFaltante = 0;

        inputs.forEach(input => {
            const nota = parseFloat(input.value);
            const porcentaje = parseFloat(input.dataset.porcentaje);
            if (!isNaN(nota)) {
                sumaPonderadaExistente += nota * (porcentaje / 100);
            } else {
                porcentajeFaltante = porcentaje / 100;
            }
        });

        const porcentajeTotalCorte = inputs.reduce((acc, input) => acc + parseFloat(input.dataset.porcentaje), 0);
        const notaRequerida = (metaDeseada * (porcentajeTotalCorte / 100) - sumaPonderadaExistente) / porcentajeFaltante;

        const inputVacio = inputsVacios[0];
        if (notaRequerida > 5.0) {
            showAlert("❌ Imposible", `Necesitarías sacar ${notaRequerida.toFixed(2)}, que es mayor a 5.0.`);
            inputVacio.value = '';
        } else if (notaRequerida < 0) {
            showAlert("✅ ¡Felicidades!", `Ya pasaste. Puedes sacar 0.0.`);
            inputVacio.value = '0.00';
        } else {
            showAlert("✅ Nota Requerida", `Necesitas ${notaRequerida.toFixed(2)} en la actividad faltante.`);
            inputVacio.value = notaRequerida.toFixed(2);
        }

        actualizarColorInput(inputVacio);
        calcularCorte(numeroCorte);
    }

    function estimarNotaFinal(metaFinal) {
        let sumaPonderadaExistente = 0;
        let corteFaltante = null;
        let cortesIncompletos = 0;

        for (let i = 1; i <= 3; i++) {
            const nota = parseFloat(document.getElementById(`totalCorte${i}`).textContent);
            if (!isNaN(nota)) {
                sumaPonderadaExistente += nota * PESO_CORTES[i];
            } else {
                cortesIncompletos++;
                corteFaltante = i;
            }
        }

        if (cortesIncompletos === 0) return showAlert("⚠️ Todos los cortes completos", "No se puede estimar.");
        if (cortesIncompletos > 1) return showAlert("⚠️ Múltiples cortes incompletos", "Debe haber solo uno sin calcular.");

        const pesoFaltante = PESO_CORTES[corteFaltante];
        const notaRequerida = (metaFinal - sumaPonderadaExistente) / pesoFaltante;

        if (notaRequerida > 5.0) {
            showAlert("❌ Imposible", `Necesitarías ${notaRequerida.toFixed(2)} en el Corte ${corteFaltante}.`);
        } else if (notaRequerida < 0) {
            showAlert("✅ ¡Felicidades!", `Ya alcanzaste tu meta. Puedes sacar 0.0.`);
        } else {
            showAlert("✅ Nota Requerida", `Necesitas ${notaRequerida.toFixed(2)} en el Corte ${corteFaltante}.`);
            document.getElementById(`manualCorte${corteFaltante}`).value = notaRequerida.toFixed(2);
            actualizarColorInput(document.getElementById(`manualCorte${corteFaltante}`));
        }
    }

    // ==========================================================================
    // 5. UI
    // ==========================================================================

    function reproducirClic() {
        try {
            const clickSound = new Audio("https://www.soundjay.com/button/sounds/button-16.mp3");
            clickSound.currentTime = 0;
            clickSound.play();
        } catch (e) {}
    }

    function actualizarBarra(id, nota) {
        const barra = document.getElementById(id);
        if (!barra) return;
        const porcentaje = Math.min((nota / 5) * 100, 100);
        barra.style.width = `${porcentaje}%`;
        barra.className = 'barra';
        if (nota >= 3) barra.classList.add('verde');
        else if (nota >= 2) barra.classList.add('amarillo');
        else barra.classList.add('rojo');
    }

    function actualizarColorfila(fila, nota) {
        if (!fila) return;
        fila.classList.remove('fila-verde', 'fila-amarilla', 'fila-roja');
        if (nota >= 3) fila.classList.add('fila-verde');
        else if (nota >= 2) fila.classList.add('fila-amarilla');
        else fila.classList.add('fila-roja');
    }

    function actualizarColorMetaFinal(notaFinal) {
        const metaInput = document.getElementById('metaFinal');
        if (!metaInput) return;
        const meta = parseFloat(metaInput.value);
        metaInput.classList.remove('success-bg', 'danger-bg');
        if (!isNaN(meta)) {
            if (notaFinal >= meta) metaInput.classList.add('success-bg');
            else metaInput.classList.add('danger-bg');
        }
    }

    function toggleModo() {
        const esClaro = document.body.classList.toggle('light');
        modoToggleBtn.textContent = esClaro ? '☀️' : '🌙';
        localStorage.setItem('calculadoraModo', esClaro ? 'claro' : 'oscuro');
        reproducirClic();
    }

    // ✅ VERSIÓN NUEVA de actualizarColorInput
    function actualizarColorInput(input) {
        input.classList.remove('verde-input', 'amarillo-input', 'rojo-input');

        const valor = parseFloat(input.value);
        if (isNaN(valor)) return;

        let colorClase = '';
        if (valor >= 3.0) {
            input.classList.add('verde-input');
            colorClase = 'fila-verde';
        } else if (valor >= 2.0) {
            input.classList.add('amarillo-input');
            colorClase = 'fila-amarilla';
        } else {
            input.classList.add('rojo-input');
            colorClase = 'fila-roja';
        }

        const fila = input.closest('tr');
        if (fila) {
            fila.classList.remove('fila-verde', 'fila-amarilla', 'fila-roja');
            fila.classList.add(colorClase);
        }
    }

    // ==========================================================================
    // 6. LOCALSTORAGE
    // ==========================================================================

    function guardarDatos() {
        const datos = {};
        document.querySelectorAll('input[id^="nota-c"]').forEach(input => datos[input.id] = input.value);
        document.querySelectorAll('input[id^="manualCorte"]').forEach(input => datos[input.id] = input.value);
        datos.metaFinal = document.getElementById('metaFinal').value;
        localStorage.setItem('calculadoraNotas', JSON.stringify(datos));
    }

    function cargarDatos() {
        const datos = JSON.parse(localStorage.getItem('calculadoraNotas'));
        if (datos) {
            Object.keys(datos).forEach(id => {
                const input = document.getElementById(id);
                if (input) {
                    input.value = datos[id];
                    actualizarColorInput(input);
                }
            });
            for (let i = 1; i <= 3; i++) calcularCorte(i);
            calcularNotaFinal();
        }

        const modoGuardado = localStorage.getItem('calculadoraModo');
        if (modoGuardado === 'claro') {
            document.body.classList.add('light');
            modoToggleBtn.textContent = '☀️';
        } else {
            document.body.classList.remove('light');
            modoToggleBtn.textContent = '🌙';
        }
    }

    function limpiarTodo() {
        localStorage.removeItem('calculadoraNotas');
        location.reload();
    }

    // ==========================================================================
    // 7. EXPORTACIÓN (se omite por espacio)
    // ==========================================================================

    function exportarExcel() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Notas");

    sheet.columns = [
        { header: "Corte", width: 15 },
        { header: "Actividad", width: 25 },
        { header: "%", width: 10 },
        { header: "Nota", width: 10 }
    ];

    const aplicarColor = (cell, valor) => {
        if (valor >= 3) {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'C6EFCE' } // Verde claro
            };
            cell.font = { color: { argb: '006100' } };
        } else if (valor >= 2) {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFEB9C' } // Amarillo claro
            };
            cell.font = { color: { argb: '9C5700' } };
        } else {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFC7CE' } // Rojo claro
            };
            cell.font = { color: { argb: '9C0006' } };
        }
    };

    for (let i = 1; i <= 3; i++) {
        sheet.addRow([`Corte ${i}`, '', '', '']);

        const rows = document.querySelectorAll(`.corte${i}`);
        rows.forEach(input => {
            const fila = input.closest("tr");
            const actividad = fila.children[0].textContent;
            const porcentaje = fila.children[1].textContent;
            const nota = input.value || "-";

            const row = sheet.addRow(['', actividad, porcentaje, nota]);
            const notaNum = parseFloat(nota);
            if (!isNaN(notaNum)) aplicarColor(row.getCell(4), notaNum);
        });

        const total = document.getElementById(`totalCorte${i}`).textContent;
        const totalRow = sheet.addRow(['', `Total Corte ${i}`, `${(PESO_CORTES[i] * 100).toFixed(0)}%`, total]);
        const totalNum = parseFloat(total);
        if (!isNaN(totalNum)) aplicarColor(totalRow.getCell(4), totalNum);

        sheet.addRow([]);
    }

    const notaFinal = document.getElementById("notaFinal").textContent;
    const finalRow = sheet.addRow(['', '', 'Nota Final', notaFinal]);
    const notaFinalNum = parseFloat(notaFinal);
    if (!isNaN(notaFinalNum)) aplicarColor(finalRow.getCell(4), notaFinalNum);

    workbook.xlsx.writeBuffer().then(buffer => {
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "Notas_Calculadora.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showAlert("✅ Exportado", "Los datos se han exportado a Excel correctamente.");
    });
}

    function exportarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Calculadora de Notas", 14, 15);

  const head = [["Actividad","%","Nota"]];
  const body = [];

  for (let i = 1; i <= 3; i++) {
    body.push([`Corte ${i}`, "", ""]);
    document.querySelectorAll(`.corte${i}`).forEach(input => {
      const fila = input.closest("tr");
      const actividad = fila.children[0].textContent;
      const porcentaje = fila.children[1].textContent;
      const nota = input.value || "-";
      body.push([actividad, porcentaje, nota]);
    });
    const total = document.getElementById(`totalCorte${i}`).textContent;
    body.push(["Total Corte", "", total]);
    body.push([]);
  }
  const notaFinal = document.getElementById('notaFinal').textContent;
  body.push(["Nota Final", "", notaFinal]);

  doc.autoTable({
    startY: 25,
    head,
    body,
    theme: 'grid'
  });

  doc.save('Notas_Calculadora.pdf');
  showAlert("✅ Exportado", "Los datos se han exportado a PDF correctamente.");
}

    // ==========================================================================
    // 8. INICIO
    // ==========================================================================
    function init() {
        bindEvents();
        cargarDatos();
    }

    init();

});

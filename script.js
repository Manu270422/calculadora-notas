// ==========================================================================
// CALCULADORA DE NOTAS — script.js
// Autor: Carlos Manuel Turizo Hernández / Jesús Alberto Turizo Hernández
//
// Aquí manejo toda la lógica de la calculadora:
// cálculos por corte, estimaciones, guardado en localStorage,
// el modal personalizado y la exportación a PDF y Excel.
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {

  // --------------------------------------------------------------------------
  // 1. SELECCIONO LOS ELEMENTOS DEL DOM QUE VOY A USAR
  // --------------------------------------------------------------------------
  const modoToggleBtn       = document.getElementById('modo-toggle');
  const bloqueInstrucciones = document.getElementById('bloqueInstrucciones');
  const instruccionesHeader = document.getElementById('toggleInstruccionesHeader');
  const instruccionesChevron = document.getElementById('instruccionesChevron');

  const calcularFinalBtn    = document.getElementById('calcular-final-btn');
  const limpiarTodoBtn      = document.getElementById('limpiar-todo-btn');
  const estimarFinalBtn     = document.getElementById('estimar-final-btn');

  const imprimirBtn         = document.getElementById('imprimir-btn');
  const exportarPdfBtn      = document.getElementById('exportar-pdf-btn');
  const exportarExcelBtn    = document.getElementById('exportar-excel-btn');

  // Pesos de cada corte según el reglamento académico
  const PESO_CORTES = { 1: 0.30, 2: 0.30, 3: 0.40 };

  // Elementos del modal que reutilizo para alertas, confirmaciones y prompts
  const customModal    = document.getElementById('custom-modal');
  const modalIcon      = document.getElementById('modal-icon');
  const modalTitle     = document.getElementById('modal-title');
  const modalMessage   = document.getElementById('modal-message');
  const modalInput     = document.getElementById('modal-input');
  const modalOkBtn     = document.getElementById('modal-ok-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');

  // --------------------------------------------------------------------------
  // 2. SISTEMA DE MODAL PERSONALIZADO
  // Reemplacé window.alert, window.confirm y window.prompt por estas
  // funciones que devuelven Promesas. Así puedo usar async/await y el modal
  // respeta el tema oscuro/claro y se ve profesional.
  // --------------------------------------------------------------------------

  /**
   * Muestro una alerta simple con un icono y un mensaje.
   * @param {string} icon  - Emoji para el encabezado del modal
   * @param {string} title - Título del modal
   * @param {string} msg   - Mensaje descriptivo
   * @returns {Promise<void>}
   */
  function showAlert(icon, title, msg) {
    return new Promise(resolve => {
      modalIcon.textContent = icon;
      modalTitle.textContent = title;
      modalMessage.textContent = msg;
      modalInput.classList.add('hidden');
      modalOkBtn.classList.remove('hidden');
      modalCancelBtn.classList.add('hidden');
      modalOkBtn.textContent = 'Aceptar';

      // Cuando hago clic en OK, cierro el modal y resuelvo la promesa
      modalOkBtn.onclick = () => { cerrarModal(); resolve(); };
      abrirModal();
    });
  }

  /**
   * Muestro un diálogo de confirmación (Sí / No).
   * @returns {Promise<boolean>} true si el usuario aceptó, false si canceló
   */
  function showConfirm(icon, title, msg) {
    return new Promise(resolve => {
      modalIcon.textContent = icon;
      modalTitle.textContent = title;
      modalMessage.textContent = msg;
      modalInput.classList.add('hidden');
      modalOkBtn.classList.remove('hidden');
      modalCancelBtn.classList.remove('hidden');
      modalOkBtn.textContent = 'Sí, borrar';
      modalCancelBtn.textContent = 'Cancelar';

      modalOkBtn.onclick     = () => { cerrarModal(); resolve(true); };
      modalCancelBtn.onclick = () => { cerrarModal(); resolve(false); };
      abrirModal();
    });
  }

  /**
   * Muestro un campo de entrada para que el usuario escriba un número.
   * @param {string} icon         - Emoji de cabecera
   * @param {string} title        - Título
   * @param {string} msg          - Mensaje de instrucción
   * @param {string} defaultValue - Valor inicial del input
   * @returns {Promise<number|null>} El número ingresado o null si canceló
   */
  function showPrompt(icon, title, msg, defaultValue = '') {
    return new Promise(resolve => {
      modalIcon.textContent = icon;
      modalTitle.textContent = title;
      modalMessage.textContent = msg;
      modalInput.value = defaultValue;
      modalInput.classList.remove('hidden');
      modalOkBtn.classList.remove('hidden');
      modalCancelBtn.classList.remove('hidden');
      modalOkBtn.textContent = 'Calcular';
      modalCancelBtn.textContent = 'Cancelar';

      const confirmar = () => {
        const val = parseFloat(modalInput.value);
        cerrarModal();
        resolve(isNaN(val) ? null : val);
      };

      modalOkBtn.onclick     = confirmar;
      modalCancelBtn.onclick = () => { cerrarModal(); resolve(null); };

      // Permito confirmar con Enter para que sea más cómodo en móvil
      modalInput.onkeydown = (e) => { if (e.key === 'Enter') confirmar(); };

      abrirModal();
      setTimeout(() => modalInput.focus(), 150); // Espero a que abra la animación
    });
  }

  // Cierro el modal si el usuario hace clic en el fondo oscuro
  customModal.addEventListener('click', (e) => {
    if (e.target === customModal) cerrarModal();
  });

  // También cierro con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && customModal.classList.contains('visible')) {
      cerrarModal();
    }
  });

  function abrirModal()  { customModal.classList.add('visible'); }
  function cerrarModal() { customModal.classList.remove('visible'); }

  // --------------------------------------------------------------------------
  // 3. REGISTRO DE EVENTOS
  // Separo el registro de eventos para tener el código más organizado.
  // --------------------------------------------------------------------------
  function bindEvents() {

    // Modo claro/oscuro
    modoToggleBtn.addEventListener('click', toggleModo);

    // Colapsar/expandir instrucciones
    instruccionesHeader.addEventListener('click', toggleInstrucciones);
    instruccionesHeader.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleInstrucciones(); }
    });

    // Botones principales
    calcularFinalBtn.addEventListener('click', calcularNotaFinal);
    limpiarTodoBtn.addEventListener('click', handleLimpiar);
    estimarFinalBtn.addEventListener('click', handleEstimarFinal);

    // Exportaciones
    imprimirBtn.addEventListener('click', () => window.print());
    exportarPdfBtn.addEventListener('click', exportarPDF);
    exportarExcelBtn.addEventListener('click', exportarExcel);

    // Botones por corte (los recorro con un for para no repetirme)
    for (let i = 1; i <= 3; i++) {
      document.getElementById(`calcular-corte-${i}-btn`).addEventListener('click', () => calcularCorte(i));
      document.getElementById(`estimar-corte-${i}-btn`).addEventListener('click', () => handleEstimarCorte(i));
      document.getElementById(`usar-manual-${i}-btn`).addEventListener('click', () => usarNotaManual(i));
    }

    // Actualizo el color de cada input en tiempo real al escribir
    document.querySelectorAll('input[type="number"]').forEach((input, idx) => {
      input.addEventListener('input', () => {
        // Solo proceso los inputs de notas de actividades (clase .nota-input)
        if (input.classList.contains('nota-input')) {
          actualizarColorInput(input);
          actualizarMiniBarra(input, idx);
        }
        guardarDatos();
      });
    });
  }

  // --------------------------------------------------------------------------
  // 4. LÓGICA DE CÁLCULOS
  // --------------------------------------------------------------------------

  /**
   * Calculo la nota de un corte a partir de sus actividades.
   * Uso la fórmula de promedio ponderado:
   * total = Σ(nota_i × porcentaje_i) / Σ(porcentaje_i)
   * Solo incluyo las actividades que el estudiante haya rellenado.
   */
  function calcularCorte(numeroCorte) {
    const inputs = document.querySelectorAll(`.corte${numeroCorte}`);
    let sumaPonderada = 0;
    let porcentajeSumado = 0;

    inputs.forEach(input => {
      const nota = parseFloat(input.value);
      const pct  = parseFloat(input.dataset.porcentaje);
      if (!isNaN(nota) && nota >= 0 && nota <= 5) {
        sumaPonderada  += nota * (pct / 100);
        porcentajeSumado += pct;
      }
    });

    // Si no hay ninguna nota ingresada, no muestro nada
    if (porcentajeSumado === 0) return;

    // Normalizo la nota al total de % ingresados
    const notaCorte = sumaPonderada / (porcentajeSumado / 100);
    mostrarTotalCorte(numeroCorte, notaCorte);
    guardarDatos();
  }

  /**
   * Permito al estudiante ingresar directamente la nota del corte
   * si ya la tiene (por ejemplo, la dio el profesor directamente).
   */
  function usarNotaManual(numeroCorte) {
    const input = document.getElementById(`manualCorte${numeroCorte}`);
    const nota  = parseFloat(input.value);

    if (isNaN(nota) || nota < 0 || nota > 5) {
      showAlert('⚠️', 'Nota inválida', 'Ingresa una nota entre 0.0 y 5.0.');
      return;
    }

    mostrarTotalCorte(numeroCorte, nota);
    guardarDatos();
  }

  /**
   * Actualizo el span, la barra y el estado visual de la card de un corte.
   */
  function mostrarTotalCorte(numeroCorte, nota) {
    const span = document.getElementById(`totalCorte${numeroCorte}`);
    const card = document.getElementById(`card-corte-${numeroCorte}`);

    span.textContent = nota.toFixed(2);
    actualizarClaseEstado(span, nota, ['aprobado', 'advertencia', 'reprobado']);
    actualizarClaseEstado(card, nota, ['estado-aprobado', 'estado-advertencia', 'estado-reprobado']);
    actualizarBarra(`barraCorte${numeroCorte}`, nota);
  }

  /**
   * Calculo la nota final ponderando los 3 cortes según sus pesos.
   * Muestro un aviso si algún corte todavía no está calculado.
   */
  function calcularNotaFinal() {
    let total = 0;
    let cortesFaltantes = [];

    for (let i = 1; i <= 3; i++) {
      const val = parseFloat(document.getElementById(`totalCorte${i}`).textContent);
      if (isNaN(val)) {
        cortesFaltantes.push(i);
      } else {
        total += val * PESO_CORTES[i];
      }
    }

    if (cortesFaltantes.length > 0) {
      showAlert('⚠️', 'Cortes incompletos',
        `Todavía me falta calcular el Corte ${cortesFaltantes.join(' y el Corte ')}.`);
      return;
    }

    const notaEl = document.getElementById('notaFinal');
    const estadoEl = document.getElementById('final-estado');
    const cardFinal = document.getElementById('card-final');

    notaEl.textContent = total.toFixed(2);

    // Animación de "pop" para que se note el cambio
    notaEl.classList.remove('pop');
    void notaEl.offsetWidth; // Truco para reiniciar la animación CSS
    notaEl.classList.add('pop');

    actualizarClaseEstado(notaEl, total, ['aprobado', 'advertencia', 'reprobado']);
    actualizarClaseEstado(cardFinal, total, ['estado-aprobado', 'estado-advertencia', 'estado-reprobado']);
    actualizarBarra('barraFinal', total);

    // Mensaje de estado
    if (total >= 3.0) {
      estadoEl.textContent = '✅ ¡Aprobado!';
      estadoEl.className = 'final-estado aprobado';
    } else if (total >= 2.0) {
      estadoEl.textContent = '⚠️ En riesgo';
      estadoEl.className = 'final-estado advertencia';
    } else {
      estadoEl.textContent = '❌ Reprobado';
      estadoEl.className = 'final-estado reprobado';
    }

    // Comparo con la meta si el estudiante la definió
    const meta = parseFloat(document.getElementById('metaFinal').value);
    if (!isNaN(meta)) {
      if (total >= meta) {
        showAlert('🎉', '¡Objetivo cumplido!', `Tu nota final es ${total.toFixed(2)}, superaste tu meta de ${meta.toFixed(1)}.`);
      } else {
        showAlert('📊', 'Resultado calculado', `Tu nota final es ${total.toFixed(2)}. Te faltó ${(meta - total).toFixed(2)} para alcanzar tu meta de ${meta.toFixed(1)}.`);
      }
    }

    guardarDatos();
  }

  /**
   * Estimo cuánto necesita el estudiante en una actividad faltante de un corte.
   * Requiere exactamente UNA casilla vacía.
   */
  async function handleEstimarCorte(numeroCorte) {
    const meta = await showPrompt('🎯', `Estimar Corte ${numeroCorte}`,
      `¿Qué nota deseas alcanzar en el Corte ${numeroCorte}? (0.0 – 5.0)`, '3.0');

    if (meta === null) return;
    if (meta < 0 || meta > 5) {
      showAlert('❌', 'Nota inválida', 'Ingresa un valor entre 0.0 y 5.0.');
      return;
    }

    const inputs = Array.from(document.querySelectorAll(`.corte${numeroCorte}`));
    const vacios = inputs.filter(i => i.value.trim() === '');

    if (vacios.length !== 1) {
      showAlert('⚠️', 'Error de estimación',
        `Necesito exactamente UNA casilla vacía en el Corte ${numeroCorte} para poder estimar.`);
      return;
    }

    let sumaPonderada = 0;
    let pctFaltante = 0;
    let pctTotal = 0;

    inputs.forEach(input => {
      const nota = parseFloat(input.value);
      const pct  = parseFloat(input.dataset.porcentaje);
      pctTotal += pct;
      if (!isNaN(nota)) {
        sumaPonderada += nota * (pct / 100);
      } else {
        pctFaltante = pct / 100;
      }
    });

    // Despejo la nota faltante de la ecuación del promedio ponderado
    const notaRequerida = (meta * (pctTotal / 100) - sumaPonderada) / pctFaltante;

    if (notaRequerida > 5.0) {
      showAlert('❌', '¡Imposible!',
        `Necesitarías ${notaRequerida.toFixed(2)}, que supera el máximo de 5.0. No es posible alcanzar esa meta.`);
    } else if (notaRequerida < 0) {
      showAlert('✅', '¡Ya lo lograste!', 'Con las notas que tienes ya superas esa meta, incluso sacando 0.0.');
      vacios[0].value = '0.00';
      actualizarColorInput(vacios[0]);
      calcularCorte(numeroCorte);
    } else {
      showAlert('📝', 'Nota requerida',
        `Necesitas sacar ${notaRequerida.toFixed(2)} en la actividad que tienes pendiente.`);
      vacios[0].value = notaRequerida.toFixed(2);
      actualizarColorInput(vacios[0]);
      calcularCorte(numeroCorte);
    }
  }

  /**
   * Estimo cuánto necesita el estudiante en el único corte que le falta.
   * Deben estar calculados exactamente 2 de los 3 cortes.
   */
  async function handleEstimarFinal() {
    const meta = await showPrompt('🎯', 'Estimar Nota Final',
      '¿Qué nota final deseas alcanzar? (0.0 – 5.0)', '3.0');

    if (meta === null) return;
    if (meta < 0 || meta > 5) {
      showAlert('❌', 'Nota inválida', 'Ingresa un valor entre 0.0 y 5.0.');
      return;
    }

    let sumaPonderada = 0;
    let corteFaltante = null;
    let cortesVacios = 0;

    for (let i = 1; i <= 3; i++) {
      const val = parseFloat(document.getElementById(`totalCorte${i}`).textContent);
      if (isNaN(val)) {
        cortesVacios++;
        corteFaltante = i;
      } else {
        sumaPonderada += val * PESO_CORTES[i];
      }
    }

    if (cortesVacios === 0) {
      showAlert('⚠️', 'Todos completos', 'Ya tienes los 3 cortes calculados. Usa "Calcular Final" directamente.');
      return;
    }
    if (cortesVacios > 1) {
      showAlert('⚠️', 'Faltan varios cortes', 'Necesito que solo falte UN corte para poder estimar.');
      return;
    }

    const pesoFaltante  = PESO_CORTES[corteFaltante];
    const notaRequerida = (meta - sumaPonderada) / pesoFaltante;

    if (notaRequerida > 5.0) {
      showAlert('❌', '¡Imposible!',
        `Para ese objetivo necesitarías ${notaRequerida.toFixed(2)} en el Corte ${corteFaltante}, que supera 5.0.`);
    } else if (notaRequerida < 0) {
      showAlert('✅', '¡Ya lo lograste!', 'Con tus cortes actuales ya alcanzas esa nota final.');
    } else {
      showAlert('📝', `Necesitas en Corte ${corteFaltante}`,
        `Debes sacar ${notaRequerida.toFixed(2)} en el Corte ${corteFaltante} para alcanzar tu meta de ${meta.toFixed(1)}.`);
      // Pongo el valor en el campo manual para que sea más cómodo
      const manualInput = document.getElementById(`manualCorte${corteFaltante}`);
      manualInput.value = notaRequerida.toFixed(2);
      actualizarColorInput(manualInput);
    }
  }

  // Handler para limpiar todo con confirmación
  async function handleLimpiar() {
    const confirmado = await showConfirm('🗑', '¿Borrar todo?',
      'Esta acción eliminará todas las notas que ingresaste. No se puede deshacer.');
    if (confirmado) {
      localStorage.removeItem('calculadoraNotas');
      location.reload();
    }
  }

  // --------------------------------------------------------------------------
  // 5. FUNCIONES DE INTERFAZ Y ANIMACIONES
  // --------------------------------------------------------------------------

  /**
   * Actualizo el color de un input según la nota ingresada.
   * Verde ≥ 3.0 | Amarillo ≥ 2.0 | Rojo < 2.0
   */
  function actualizarColorInput(input) {
    input.classList.remove('nota-aprobado', 'nota-advertencia', 'nota-reprobado');
    const val = parseFloat(input.value);
    if (isNaN(val) || input.value.trim() === '') return;

    if (val >= 3.0)      input.classList.add('nota-aprobado');
    else if (val >= 2.0) input.classList.add('nota-advertencia');
    else                 input.classList.add('nota-reprobado');
  }

  /**
   * Actualizo la mini-barra debajo de cada actividad al escribir.
   * Le doy retroalimentación visual inmediata al estudiante.
   */
  function actualizarMiniBarra(input, idx) {
    // Obtengo el índice del input dentro de su grupo de corte
    const grupo = input.classList[1]; // corte1, corte2 o corte3
    const grupoInputs = Array.from(document.querySelectorAll(`.${grupo}`));
    const posicion = grupoInputs.indexOf(input);
    const corteNum = grupo.replace('corte', '');

    const barraId = `mb-c${corteNum}-${posicion}`;
    const barra   = document.getElementById(barraId);
    if (!barra) return;

    const val     = parseFloat(input.value);
    const ancho   = isNaN(val) ? 0 : Math.min((val / 5) * 100, 100);
    barra.style.width = `${ancho}%`;

    // Color de la mini-barra según la nota
    if (isNaN(val) || val < 2.0)      barra.style.background = 'var(--danger)';
    else if (val < 3.0)               barra.style.background = 'var(--warning)';
    else                              barra.style.background = 'var(--success)';
  }

  /**
   * Actualizo la barra de progreso principal de un corte o del total final.
   */
  function actualizarBarra(id, nota) {
    const barra = document.getElementById(id);
    if (!barra) return;
    barra.style.width = `${Math.min((nota / 5) * 100, 100)}%`;
    barra.className = 'barra';
    if (nota >= 3.0)      barra.classList.add('verde');
    else if (nota >= 2.0) barra.classList.add('amarillo');
    else                  barra.classList.add('rojo');
  }

  /**
   * Función utilitaria para aplicar clases de estado (aprobado/advertencia/reprobado)
   * a cualquier elemento según la nota. Uso un array de clases en el mismo orden.
   */
  function actualizarClaseEstado(el, nota, clases) {
    el.classList.remove(...clases);
    if (nota >= 3.0)      el.classList.add(clases[0]);
    else if (nota >= 2.0) el.classList.add(clases[1]);
    else                  el.classList.add(clases[2]);
  }

  /**
   * Alterno entre modo oscuro y claro, y lo guardo en localStorage
   * para que persista entre sesiones.
   */
  function toggleModo() {
    const esClaro = document.body.classList.toggle('light');
    modoToggleBtn.textContent = esClaro ? '☀️' : '🌙';
    localStorage.setItem('calculadoraModo', esClaro ? 'claro' : 'oscuro');
  }

  /**
   * Colapso o expando el bloque de instrucciones con animación CSS.
   */
  function toggleInstrucciones() {
    bloqueInstrucciones.classList.toggle('collapsed');
  }

  // --------------------------------------------------------------------------
  // 6. PERSISTENCIA EN LOCALSTORAGE
  // Guardo y cargo los datos para que el estudiante no pierda su trabajo
  // si cierra el navegador accidentalmente.
  // --------------------------------------------------------------------------

  /**
   * Recopilo todas las notas ingresadas y las guardo como JSON.
   * Corrijo el bug de la versión anterior que no guardaba las notas
   * de las actividades individuales (los inputs .corteN no tienen id).
   */
  function guardarDatos() {
    const datos = { notas: {}, manuales: {}, totales: {}, metaFinal: '' };

    // Guardo las notas de las actividades individuales usando un índice
    for (let corte = 1; corte <= 3; corte++) {
      datos.notas[corte] = [];
      document.querySelectorAll(`.corte${corte}`).forEach(input => {
        datos.notas[corte].push(input.value);
      });

      // Notas manuales de los cortes
      const manualInput = document.getElementById(`manualCorte${corte}`);
      if (manualInput) datos.manuales[corte] = manualInput.value;

      // Totales calculados
      const total = document.getElementById(`totalCorte${corte}`).textContent;
      datos.totales[corte] = total !== '—' ? total : '';
    }

    datos.metaFinal = document.getElementById('metaFinal').value;
    const notaFinalText = document.getElementById('notaFinal').textContent;
    datos.notaFinal = notaFinalText !== '—' ? notaFinalText : '';

    localStorage.setItem('calculadoraNotas', JSON.stringify(datos));
  }

  /**
   * Cargo los datos guardados y reconstruyo el estado de la calculadora.
   * También restauro el modo claro/oscuro preferido.
   */
  function cargarDatos() {
    // Modo claro/oscuro
    const modoGuardado = localStorage.getItem('calculadoraModo');
    if (modoGuardado === 'claro') {
      document.body.classList.add('light');
      modoToggleBtn.textContent = '☀️';
    }

    // Datos de notas
    const datos = JSON.parse(localStorage.getItem('calculadoraNotas'));
    if (!datos) return;

    for (let corte = 1; corte <= 3; corte++) {
      // Restauro las notas de las actividades
      if (datos.notas && datos.notas[corte]) {
        const inputs = document.querySelectorAll(`.corte${corte}`);
        datos.notas[corte].forEach((valor, idx) => {
          if (inputs[idx] && valor !== '') {
            inputs[idx].value = valor;
            actualizarColorInput(inputs[idx]);
            actualizarMiniBarra(inputs[idx], idx);
          }
        });
      }

      // Restauro las notas manuales
      if (datos.manuales && datos.manuales[corte]) {
        const manualInput = document.getElementById(`manualCorte${corte}`);
        if (manualInput) {
          manualInput.value = datos.manuales[corte];
          actualizarColorInput(manualInput);
        }
      }

      // Restauro los totales calculados
      if (datos.totales && datos.totales[corte]) {
        const notaCorte = parseFloat(datos.totales[corte]);
        if (!isNaN(notaCorte)) mostrarTotalCorte(corte, notaCorte);
      }
    }

    // Restauro la meta y la nota final
    if (datos.metaFinal) {
      document.getElementById('metaFinal').value = datos.metaFinal;
    }

    if (datos.notaFinal) {
      const total = parseFloat(datos.notaFinal);
      const notaEl    = document.getElementById('notaFinal');
      const estadoEl  = document.getElementById('final-estado');
      const cardFinal = document.getElementById('card-final');
      notaEl.textContent = total.toFixed(2);
      actualizarClaseEstado(notaEl, total, ['aprobado', 'advertencia', 'reprobado']);
      actualizarClaseEstado(cardFinal, total, ['estado-aprobado', 'estado-advertencia', 'estado-reprobado']);
      actualizarBarra('barraFinal', total);

      if (total >= 3.0)      { estadoEl.textContent = '✅ ¡Aprobado!';  estadoEl.className = 'final-estado aprobado'; }
      else if (total >= 2.0) { estadoEl.textContent = '⚠️ En riesgo';   estadoEl.className = 'final-estado advertencia'; }
      else                   { estadoEl.textContent = '❌ Reprobado';    estadoEl.className = 'final-estado reprobado'; }
    }
  }

  // --------------------------------------------------------------------------
  // 7. EXPORTACIÓN A PDF
  // Uso jsPDF + AutoTable para generar un PDF limpio con las notas.
  // --------------------------------------------------------------------------
  function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Encabezado
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Calculadora de Notas', 105, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-CO')}`, 105, 25, { align: 'center' });
    doc.setTextColor(0);

    const head = [['Actividad', '%', 'Nota']];
    const body = [];

    // Construyo las filas por corte
    const nombresCorte = ['Corte 1 (30%)', 'Corte 2 (30%)', 'Corte 3 (40%)'];
    const actividades  = [
      [['Parcial', '20%'], ['Quiz', '5%'], ['Trabajo', '5%']],
      [['Parcial', '20%'], ['Quiz', '5%'], ['Trabajo', '5%']],
      [['Parcial', '30%'], ['Quiz', '5%'], ['Trabajo', '5%']],
    ];

    for (let i = 1; i <= 3; i++) {
      body.push([{ content: nombresCorte[i - 1], colSpan: 3, styles: { fontStyle: 'bold', fillColor: [79, 124, 255], textColor: 255 } }]);

      const inputs = document.querySelectorAll(`.corte${i}`);
      actividades[i - 1].forEach((act, idx) => {
        // El guión largo (—) puede dar problemas en Helvetica; uso '-' como fallback
        const nota = inputs[idx] ? (inputs[idx].value || '-') : '-';
        body.push([act[0], act[1], nota]);
      });

      const totalRaw = document.getElementById(`totalCorte${i}`).textContent;
      const total = totalRaw === '—' ? '-' : totalRaw;
      body.push([{ content: `Total Corte ${i}`, colSpan: 2, styles: { fontStyle: 'bold' } }, total]);
      body.push([{ content: '', colSpan: 3 }]);
    }

    // jsPDF usa la fuente Helvetica que NO soporta emojis — uso texto plano aquí
    // para evitar que aparezcan símbolos raros como "Ø=ÜÊ" en el PDF exportado
    const notaFinalRaw = document.getElementById('notaFinal').textContent;
    const notaFinal = notaFinalRaw === '—' ? '-' : notaFinalRaw;
    body.push([{ content: 'Nota Final', colSpan: 2, styles: { fontStyle: 'bold', fontSize: 12 } }, notaFinal]);

    doc.autoTable({
      startY: 32,
      head,
      body,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 10, halign: 'center' },
      headStyles: { fillColor: [15, 17, 23], textColor: 255 },
    });

    // Footer del PDF
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Carlos Manuel Turizo Hernández & Jesús Alberto Turizo Hernández', 105,
      doc.internal.pageSize.height - 8, { align: 'center' });

    doc.save('Notas_Calculadora.pdf');
    showAlert('✅', '¡PDF generado!', 'El archivo se descargó correctamente.');
  }

  // --------------------------------------------------------------------------
  // 8. EXPORTACIÓN A EXCEL
  // Uso ExcelJS para generar un .xlsx con colores según el rendimiento.
  // --------------------------------------------------------------------------
  function exportarExcel() {
    const wb    = new ExcelJS.Workbook();
    wb.creator  = 'Calculadora de Notas - CMT & JAT';
    wb.created  = new Date();
    const sheet = wb.addWorksheet('Notas');

    // Configuro el ancho de las columnas
    sheet.columns = [
      { header: 'Actividad', key: 'actividad', width: 22 },
      { header: '%',         key: 'pct',       width: 10 },
      { header: 'Nota',      key: 'nota',       width: 12 },
    ];

    // Estilo del encabezado
    sheet.getRow(1).eachCell(cell => {
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F1117' } };
      cell.font   = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { horizontal: 'center' };
    });

    // Función que aplica color a una celda según la nota
    const colorCelda = (cell, val) => {
      if (isNaN(val)) return;
      if (val >= 3.0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
        cell.font = { color: { argb: 'FF006100' } };
      } else if (val >= 2.0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
        cell.font = { color: { argb: 'FF9C5700' } };
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
        cell.font = { color: { argb: 'FF9C0006' } };
      }
    };

    const nombresCorte = ['Corte 1 (30%)', 'Corte 2 (30%)', 'Corte 3 (40%)'];
    const actividades  = [
      [['Parcial', '20%'], ['Quiz', '5%'], ['Trabajo', '5%']],
      [['Parcial', '20%'], ['Quiz', '5%'], ['Trabajo', '5%']],
      [['Parcial', '30%'], ['Quiz', '5%'], ['Trabajo', '5%']],
    ];

    for (let i = 1; i <= 3; i++) {
      // Fila de título del corte
      const tituloRow = sheet.addRow([nombresCorte[i - 1], '', '']);
      tituloRow.eachCell(cell => {
        cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F7CFF' } };
        cell.font   = { color: { argb: 'FFFFFFFF' }, bold: true };
      });

      // Filas de actividades
      const inputs = document.querySelectorAll(`.corte${i}`);
      actividades[i - 1].forEach((act, idx) => {
        const nota = inputs[idx] ? (inputs[idx].value || '') : '';
        const row  = sheet.addRow([act[0], act[1], nota]);
        colorCelda(row.getCell(3), parseFloat(nota));
        row.getCell(3).alignment = { horizontal: 'center' };
      });

      // Fila de total del corte
      const total    = document.getElementById(`totalCorte${i}`).textContent;
      const totalRow = sheet.addRow([`Total Corte ${i}`, `${PESO_CORTES[i] * 100}%`, total]);
      totalRow.eachCell(cell => { cell.font = { bold: true }; });
      colorCelda(totalRow.getCell(3), parseFloat(total));

      sheet.addRow([]); // Espacio entre cortes
    }

    // Fila de nota final
    const notaFinal    = document.getElementById('notaFinal').textContent;
    const finalRow     = sheet.addRow(['Nota Final', '', notaFinal]);
    finalRow.eachCell(cell => { cell.font = { bold: true, size: 13 }; });
    colorCelda(finalRow.getCell(3), parseFloat(notaFinal));

    // Agrego créditos al final
    sheet.addRow([]);
    const credRow = sheet.addRow(['Generado por: Carlos Manuel Turizo H. & Jesús Alberto Turizo H.']);
    credRow.getCell(1).font = { italic: true, color: { argb: 'FF888888' } };

    // Descargo el archivo
    wb.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href  = URL.createObjectURL(blob);
      link.download = 'Notas_Calculadora.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href); // Libero la memoria del objeto URL
      showAlert('✅', '¡Excel generado!', 'El archivo se descargó correctamente.');
    }).catch(() => {
      showAlert('❌', 'Error', 'No pude generar el archivo Excel. Intenta de nuevo.');
    });
  }

  // --------------------------------------------------------------------------
  // 9. INICIO
  // Registro los eventos y cargo los datos guardados al abrir la página.
  // --------------------------------------------------------------------------
  function init() {
    bindEvents();
    cargarDatos();
  }

  init();

}); // Fin del DOMContentLoaded
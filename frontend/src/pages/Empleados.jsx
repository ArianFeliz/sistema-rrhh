import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import toast from 'react-hot-toast';

const formVacio = {
  NumeroRH: '', Cedula: '', Nombre: '', Apellidos: '', Sexo: '',
  FechaNacimiento: '', Edad: '', NumeroTelefonico: '', Correo: '',
  FechaIngreso: '', TiempoEnEstadoValor: '', TiempoEnEstadoUnidad: 'años', FechaSalida: '', GrupoOcupacional: '',
  AFP: '', ARS: '', Vacaciones: '', LicenciasMedicas: '', Faltas: '',
  Estatus: 'Activo', CargoInicial: '', SalarioInicial: '',
  CargoActual: '', SalarioActual: '', Itinerario: '',
  SalarioItinerario: '', Expediente: '', SalarioTotal: ''
};

const calcularEdad = (fechaNacimiento) => {
  if (!fechaNacimiento) return '';
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const mes = hoy.getMonth() - nac.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad > 0 ? edad : '';
};

const validarCedula = (cedula) => {
  const limpia = cedula.replace(/[-\s]/g, '');
  return limpia.length === 11 && /^\d+$/.test(limpia);
};

const validarEmail = (email) => {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validarForm = (form) => {
  const errores = {};
  if (!form.Nombre.trim()) errores.Nombre = 'El nombre es obligatorio';
  if (!form.Apellidos.trim()) errores.Apellidos = 'Los apellidos son obligatorios';
  if (!form.Cedula.trim()) errores.Cedula = 'La cédula es obligatoria';
  else if (!validarCedula(form.Cedula)) errores.Cedula = 'Cédula inválida (11 dígitos)';
  if (form.Correo && !validarEmail(form.Correo)) errores.Correo = 'Correo inválido';
  if (form.Edad && (form.Edad < 16 || form.Edad > 100)) errores.Edad = 'Edad debe ser entre 16 y 100';
  if (form.SalarioActual && form.SalarioActual < 0) errores.SalarioActual = 'Salario no puede ser negativo';
  return errores;
};

const iconoAnexo = (tipo) => {
  if (tipo === '.pdf') return '📄';
  if (['.png', '.jpg', '.jpeg'].includes(tipo)) return '🖼️';
  return '📝';
};

const fmtFecha = (f) => {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });
};

const calcularAnios = (fechaIngreso) => {
  if (!fechaIngreso) return 0;
  const hoy = new Date();
  const ingreso = new Date(fechaIngreso);
  let anios = hoy.getFullYear() - ingreso.getFullYear();
  const mes = hoy.getMonth() - ingreso.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < ingreso.getDate())) anios--;
  return Math.max(0, anios);
};

const calcularTiempoEnEstado = (fechaBase, estatus) => {
  if (!fechaBase) return '—';
  const anios = calcularAnios(fechaBase);
  return `${anios} año${anios === 1 ? '' : 's'} en ${estatus || 'el estado'}`;
};

const Empleados = () => {
  const [empleados, setEmpleados]               = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [buscar, setBuscar]                     = useState('');
  const [modalAbierto, setModalAbierto]         = useState(false);
  const [modoEdicion, setModoEdicion]           = useState(false);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [form, setForm]                         = useState(formVacio);
  const [guardando, setGuardando]               = useState(false);
  const [modalVerAbierto, setModalVerAbierto]   = useState(false);
  const [empleadoVer, setEmpleadoVer]           = useState(null);
  const [erroresForm, setErroresForm]           = useState({});
  const [paginaActual, setPaginaActual]         = useState(1);
  const [filtroEstatus, setFiltroEstatus]       = useState('');
  const [modalEliminar, setModalEliminar]       = useState(false);
  const [empleadoAEliminar, setEmpleadoAEliminar] = useState(null);
  const ITEMS_POR_PAGINA = 10;

  const [modalConfirmarAnexo, setModalConfirmarAnexo] = useState(null);

  const [modalConfirmarCancelarItem, setModalConfirmarCancelarItem] = useState(null);
  const [modalConfirmarReactivarItem, setModalConfirmarReactivarItem] = useState(null);
  const [modalConfirmarEliminarVacacion, setModalConfirmarEliminarVacacion] = useState(null);


  const [vacaciones, setVacaciones]             = useState([]);
  const [vacacionesVer, setVacacionesVer]       = useState([]);
  const [modalVacaciones, setModalVacaciones]   = useState(false);
  const [empleadoVacaciones, setEmpleadoVacaciones] = useState(null);
  const [formVacacion, setFormVacacion]         = useState({ FechaInicio: '', DiasSolicitados: '', Observaciones: '' });
  const [previewVacacion, setPreviewVacacion]   = useState(null);
  const [guardandoVacacion, setGuardandoVacacion] = useState(false);
  const [loadingVacaciones, setLoadingVacaciones] = useState(false);

  // Nuevos estados para los modales de vacaciones
  const [modalCambiarEstatusVac, setModalCambiarEstatusVac] = useState(false);
  const [modalCancelarVacaciones, setModalCancelarVacaciones] = useState(false);
  const [vacacionRegistrada, setVacacionRegistrada] = useState(null);

  const [tipoAnexo, setTipoAnexo]               = useState('');
  const [anexos, setAnexos]                     = useState([]);
  const [subiendoAnexo, setSubiendoAnexo]       = useState(false);
  const [anexosVer, setAnexosVer]               = useState([]);

  const [modalHistorial, setModalHistorial]     = useState(false);
  const [empleadoHistorial, setEmpleadoHistorial] = useState(null);
  const [historial, setHistorial]               = useState([]);
  const [fechasHistorial, setFechasHistorial]   = useState([]);
  const [modalVacacionesAnuales, setModalVacacionesAnuales] = useState(false);
  const [fechaFiltroHistorial, setFechaFiltroHistorial] = useState('');
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [historialSeleccionado, setHistorialSeleccionado] = useState([]);
  const [selectAllHistorial, setSelectAllHistorial] = useState(false);

  const [modalReporte, setModalReporte]         = useState(false);
  const [filtrosReporte, setFiltrosReporte]     = useState({
    estatus: '', cargo: '', itinerario: '', AFP: '', ARS: '',
    grupoOcupacional: '', salarioMin: '', salarioMax: '', limite: ''
  });
  const [generandoReporte, setGenerandoReporte] = useState(false);

  const [filtrosAvanzados, setFiltrosAvanzados] = useState(false);
  const [filtros, setFiltros]                   = useState({
    cargo: '', salarioMin: '', salarioMax: '',
    fechaDesde: '', fechaHasta: '',
    grupoOcupacional: '', AFP: '', ARS: ''
  });

  // Nuevo estado para el modal de anexos independiente
  const [modalAnexosIndependiente, setModalAnexosIndependiente] = useState(false);
  const [empleadoAnexos, setEmpleadoAnexos] = useState(null);
  const [anexosEmpleado, setAnexosEmpleado] = useState([]);

  const cargarEmpleados = async (termino = '') => {
    setLoading(true);
    try {
      const params = termino ? `?buscar=${termino}` : '';
      const { data } = await api.get(`/empleados${params}`);
      setEmpleados(data.empleados);
    } catch {
      toast.error('Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarEmpleados(); }, []);

  useEffect(() => {
    const delay = setTimeout(() => cargarEmpleados(buscar), 400);
    return () => clearTimeout(delay);
  }, [buscar]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (buscar) cargarEmpleados(buscar);
      else cargarEmpleados();
    }, 60000); // Refresca cada 60 segundos para mantener estado sincronizado
    return () => clearInterval(interval);
  }, [buscar]);

  const cargarAnexos = async (empleadoId) => {
    try {
      const { data } = await api.get(`/anexos/${empleadoId}`);
      return data.anexos;
    } catch { return []; }
  };

  const subirAnexo = async (e, empleadoId) => {
    const file = e.target.files[0];
    if (!file || !tipoAnexo.trim()) return;
    setSubiendoAnexo(true);
    try {
      const formData = new FormData();
      formData.append('archivo', file);
      formData.append('tipoDocumento', tipoAnexo.trim());
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) throw new Error('No token de sesión disponible');
      await fetch(`http://localhost:5000/api/anexos/${empleadoId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      toast.success('Anexo subido correctamente');
      setTipoAnexo('');
      const nuevosAnexos = await cargarAnexos(empleadoId);
      setAnexos([...nuevosAnexos]);
      // Si el modal independiente está abierto, actualizar también esos anexos
      if (modalAnexosIndependiente && empleadoAnexos?.Id === empleadoId) {
        setAnexosEmpleado([...nuevosAnexos]);
      }
    } catch {
      toast.error('Error al subir el anexo');
    } finally {
      setSubiendoAnexo(false);
      e.target.value = '';
    }
  };

  const eliminarAnexo = async (anexoId, empleadoId) => {
    try {
      await api.delete(`/anexos/${empleadoId}/anexo/${anexoId}`);
      toast.success('Anexo eliminado');
      const nuevosAnexos = await cargarAnexos(empleadoId);
      setAnexos(nuevosAnexos);
      if (modalAnexosIndependiente && empleadoAnexos?.Id === empleadoId) {
        setAnexosEmpleado(nuevosAnexos);
      }
    } catch { toast.error('Error al eliminar el anexo'); }
  };

  const eliminarAnexoVer = async (anexoId, empleadoId) => {
    try {
      await api.delete(`/anexos/${empleadoId}/anexo/${anexoId}`);
      toast.success('Anexo eliminado');
      const nuevosAnexos = await cargarAnexos(empleadoId);
      setAnexosVer(nuevosAnexos);
      if (modalAnexosIndependiente && empleadoAnexos?.Id === empleadoId) {
        setAnexosEmpleado(nuevosAnexos);
      }
    } catch { toast.error('Error al eliminar el anexo'); }
  };

  const abrirAnexo = (nombreArchivo) => {
    window.open(`http://localhost:5000/api/anexos/ver/${nombreArchivo}`, '_blank');
  };

  // ── VACACIONES ──
  const cargarVacaciones = async (empleadoId) => {
    try {
      const { data } = await api.get(`/vacaciones/${empleadoId}`);
      return data.vacaciones;
    } catch { return []; }
  };

  const abrirVacaciones = async (emp) => {
    setEmpleadoVacaciones(emp);
    setModalVacaciones(true);
    setLoadingVacaciones(true);
    setFormVacacion({ FechaInicio: '', DiasSolicitados: '', Observaciones: '' });
    setPreviewVacacion(null);
    const v = await cargarVacaciones(emp.Id);
    setVacaciones(v);

    // Forzar cálculo de preview al abrir modal (incluye años desde FechaIngreso)
    if (emp.FechaIngreso || emp.TiempoEnEstadoValor) {
      const hoy = new Date().toISOString().split('T')[0];
      const diasSolicitados = Number(formVacacion.DiasSolicitados) > 0 ? formVacacion.DiasSolicitados : '';
      let url = `/vacaciones/${emp.Id}/preview?FechaInicio=${hoy}`;
      if (emp.FechaIngreso) url += `&FechaIngreso=${encodeURIComponent(emp.FechaIngreso)}`;
      if (emp.TiempoEnEstadoValor) url += `&TiempoEnEstadoValor=${encodeURIComponent(emp.TiempoEnEstadoValor)}`;
      if (emp.TiempoEnEstadoUnidad) url += `&TiempoEnEstadoUnidad=${encodeURIComponent(emp.TiempoEnEstadoUnidad)}`;
      if (diasSolicitados) url += `&DiasSolicitados=${diasSolicitados}`;
      try {
        const { data } = await api.get(url);

        setPreviewVacacion(data);
        const nuevoDias = Number(diasSolicitados) > 0 ? Number(diasSolicitados) : data.diasCorresponden;
        setForm(prev => ({ ...prev, Vacaciones: nuevoDias }));
      } catch (e) {
        console.warn('No se pudo obtener preview al abrir modal', e.message || e);
      }
    }

    setLoadingVacaciones(false);
  };

  const abrirVacacionesAnuales = () => {
    setModalVacacionesAnuales(true);
  };

  const cerrarVacacionesAnuales = () => {
    setModalVacacionesAnuales(false);
  };

  const calcularResumenVacacionesPorAnio = () => {
    const agrupado = {};
    vacaciones.forEach(v => {
      const anio = new Date(v.FechaInicio).getFullYear();
      if (!agrupado[anio]) agrupado[anio] = [];
      agrupado[anio].push(v);
    });
    return Object.keys(agrupado).sort((a,b) => Number(b) - Number(a)).map(anio => ({ anio: Number(anio), registros: agrupado[anio] }));
  };

  const anioActual = new Date().getFullYear();
  const vacacionesAnoActual = vacaciones.filter(v => new Date(v.FechaInicio).getFullYear() === anioActual);
  const vacacionesAntiguas = vacaciones.filter(v => new Date(v.FechaInicio).getFullYear() !== anioActual);

  const calcularPreviewVacacion = async (fechaInicio, empleadoId, diasSolicitados) => {
    if (!fechaInicio) { setPreviewVacacion(null); return; }
    try {
      // Siempre enviar FechaIngreso + TiempoEnEstado del empleadoVacaciones para cálculo correcto
      const fechaIngreso = empleadoVacaciones?.FechaIngreso || '';
      const tiempoValor = empleadoVacaciones?.TiempoEnEstadoValor || '';
      const tiempoUnidad = empleadoVacaciones?.TiempoEnEstadoUnidad || '';
      let url = `/vacaciones/${empleadoId}/preview?FechaInicio=${fechaInicio}`;
      if (fechaIngreso) url += `&FechaIngreso=${encodeURIComponent(fechaIngreso)}`;
      if (tiempoValor) url += `&TiempoEnEstadoValor=${encodeURIComponent(tiempoValor)}`;
      if (tiempoUnidad) url += `&TiempoEnEstadoUnidad=${encodeURIComponent(tiempoUnidad)}`;
      if (diasSolicitados) url += `&DiasSolicitados=${diasSolicitados}`;
      const { data } = await api.get(url);

      setPreviewVacacion(data);
      const nuevoDias = Number(diasSolicitados) || data.diasCorresponden;
      setForm(prev => ({ ...prev, Vacaciones: nuevoDias }));
    } catch (e) {
      setPreviewVacacion(null);
      const msg = e.response?.data?.error || 'Error al calcular preview';
      toast.error(msg);
    }
  };

  const guardarVacacion = async () => {
    if (!formVacacion.FechaInicio) { toast.error('Selecciona una fecha de inicio'); return; }
    const diasSolicitados = Number(formVacacion.DiasSolicitados);
    if (!diasSolicitados || !Number.isInteger(diasSolicitados) || diasSolicitados <= 0) {
      toast.error('Ingrese un valor válido de Días solicitados');
      return;
    }

    setGuardandoVacacion(true);
    try {
      const { data } = await api.post(`/vacaciones/${empleadoVacaciones.Id}`, formVacacion);
      toast.success('Vacaciones registradas correctamente');
      setFormVacacion({ FechaInicio: '', DiasSolicitados: '', Observaciones: '' });
      setPreviewVacacion(null);
      const v = await cargarVacaciones(empleadoVacaciones.Id);
      setVacaciones(v);
      // Actualizar el campo días en varios estados para reflejar correctamente los días solicitados
      setEmpleadoVacaciones(prev => ({ ...prev, Vacaciones: diasSolicitados }));
      setEmpleadoVer(prev => prev ? ({ ...prev, Vacaciones: diasSolicitados }) : prev);
      setEmpleadoSeleccionado(prev => prev ? ({ ...prev, Vacaciones: diasSolicitados }) : prev);
      setForm(prev => ({ ...prev, Vacaciones: diasSolicitados }));
      // Si la vacación es futura, no cambia estado inmediatamente. Permanece en el estado actual.
      const inicioVac = new Date(formVacacion.FechaInicio);
      const hoy = new Date();
      const esFutura = inicioVac > hoy;

      setVacacionRegistrada(data);
      if (!esFutura) {
        setModalCambiarEstatusVac(true);
      } else {
        setModalCambiarEstatusVac(false);
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al registrar vacaciones');
    } finally {
      setGuardandoVacacion(false);
    }
  };

  const cambiarEstatusAVacaciones = async () => {
    try {
      await api.put(`/empleados/${empleadoVacaciones.Id}`, {
        ...empleadoVacaciones,
        Estatus: 'Vacaciones',
        FechaIngreso: empleadoVacaciones.FechaIngreso ? empleadoVacaciones.FechaIngreso.split('T')[0] : '',
        FechaSalida: empleadoVacaciones.FechaSalida ? empleadoVacaciones.FechaSalida.split('T')[0] : '',
        FechaNacimiento: empleadoVacaciones.FechaNacimiento ? empleadoVacaciones.FechaNacimiento.split('T')[0] : '',
      });
      toast.success('Estatus cambiado a Vacaciones');
      cargarEmpleados(buscar);
    } catch { toast.error('Error al cambiar estatus'); }
    setModalCambiarEstatusVac(false);
  };

  const cancelarVacaciones = async (nuevoEstatus) => {
  try {
    await api.put(`/empleados/${empleadoVacaciones.Id}`, {
      ...empleadoVacaciones,
      Estatus: nuevoEstatus,
      Vacaciones: 0,
      FechaIngreso: empleadoVacaciones.FechaIngreso ? empleadoVacaciones.FechaIngreso.split('T')[0] : '',
      FechaSalida: empleadoVacaciones.FechaSalida ? empleadoVacaciones.FechaSalida.split('T')[0] : '',
      FechaNacimiento: empleadoVacaciones.FechaNacimiento ? empleadoVacaciones.FechaNacimiento.split('T')[0] : '',
    });
    toast.success(`Estatus cambiado a ${nuevoEstatus}`);
    // Actualizar valores locales para el UI y el formulario
    setEmpleadoVacaciones(prev => prev ? ({ ...prev, Estatus: nuevoEstatus, Vacaciones: 0 }) : prev);
    setEmpleadoSeleccionado(prev => prev ? ({ ...prev, Estatus: nuevoEstatus, Vacaciones: 0 }) : prev);
    setForm(prev => ({ ...prev, Vacaciones: 0 }));
    setEmpleadoVer(prev => prev ? ({ ...prev, Estatus: nuevoEstatus, Vacaciones: 0 }) : prev);
    cargarEmpleados(buscar);
  } catch { toast.error('Error al cambiar estatus'); }
  setModalCancelarVacaciones(false);
  setModalVacaciones(false);
};

  const eliminarVacacion = async (vacacionId) => {
    try {
      await api.delete(`/vacaciones/${empleadoVacaciones.Id}/vacacion/${vacacionId}`);
      toast.success('Vacaciones eliminadas');
      const v = await cargarVacaciones(empleadoVacaciones.Id);
      setVacaciones(v);
    } catch { toast.error('Error al eliminar'); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let nuevoForm = { ...form, [name]: value };
    if (name === 'FechaNacimiento') nuevoForm.Edad = calcularEdad(value);
    if (['SalarioActual', 'SalarioItinerario', 'SalarioInicial'].includes(name)) {
      const inicial = name === 'SalarioInicial' ? Number(value) : Number(nuevoForm.SalarioInicial);
      const actual = name === 'SalarioActual' ? Number(value) : Number(nuevoForm.SalarioActual);
      const itinerario = name === 'SalarioItinerario' ? Number(value) : Number(nuevoForm.SalarioItinerario);
      nuevoForm.SalarioTotal = (inicial + actual + itinerario) || '';
    }
    if (erroresForm[name]) setErroresForm({ ...erroresForm, [name]: null });
    setForm(nuevoForm);
  };

  const abrirModalCrear = async () => {
    setForm(formVacio);
    setModoEdicion(false);
    setEmpleadoSeleccionado(null);
    setErroresForm({});
    setAnexos([]);
    setTipoAnexo('');
    try {
      const { data } = await api.get('/empleados/siguiente-rh');
      setForm({ ...formVacio, NumeroRH: data.numeroRH });
    } catch { setForm(formVacio); }
    setModalAbierto(true);
  };

  const abrirModalEditar = async (emp) => {
    const fmt = (f) => f ? f.split('T')[0] : '';
    setForm({
      NumeroRH: emp.NumeroRH || '', Cedula: emp.Cedula || '',
      Nombre: emp.Nombre || '', Apellidos: emp.Apellidos || '',
      Sexo: emp.Sexo || '', FechaNacimiento: fmt(emp.FechaNacimiento),
      Edad: emp.Edad || '', NumeroTelefonico: emp.NumeroTelefonico || '',
      Correo: emp.Correo || '', FechaIngreso: fmt(emp.FechaIngreso),
      TiempoEnEstadoValor: emp.TiempoEnEstadoValor || '', TiempoEnEstadoUnidad: emp.TiempoEnEstadoUnidad || 'años',
      FechaSalida: fmt(emp.FechaSalida), GrupoOcupacional: emp.GrupoOcupacional || '',
      AFP: emp.AFP || '', ARS: emp.ARS || '', Vacaciones: emp.Vacaciones || '',
      LicenciasMedicas: emp.LicenciasMedicas || '', Faltas: emp.Faltas || '',
      Estatus: emp.Estatus || 'Activo', CargoInicial: emp.CargoInicial || '',
      SalarioInicial: emp.SalarioInicial || '', CargoActual: emp.CargoActual || '',
      SalarioActual: emp.SalarioActual || '', Itinerario: emp.Itinerario || '',
      SalarioItinerario: emp.SalarioItinerario || '', Expediente: emp.Expediente || '',
      SalarioTotal: emp.SalarioTotal || ''
    });
    setEmpleadoSeleccionado(emp);
    setModoEdicion(true);
    setModalAbierto(true);
    setTipoAnexo('');
    const a = await cargarAnexos(emp.Id);
    setAnexos(a);
  };

  const abrirModalVer = async (emp) => {
    setEmpleadoVer(emp);
    setModalVerAbierto(true);
    const [a, v] = await Promise.all([cargarAnexos(emp.Id), cargarVacaciones(emp.Id)]);
    setAnexosVer(a);
    setVacacionesVer(v);
  };

  // Nueva función para abrir el modal de anexos independiente
  const abrirModalAnexos = async (emp) => {
    setEmpleadoAnexos(emp);
    setModalAnexosIndependiente(true);
    setTipoAnexo('');
    const anexos = await cargarAnexos(emp.Id);
    setAnexosEmpleado(anexos);
  };

  const imprimirVacaciones = async () => {
    if (!empleadoVacaciones?.Id) {
      toast.error('No se encontró empleado para imprimir.');
      return;
    }

    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token) {
      toast.error('Sesión expirada. Inicia sesión nuevamente.', { id: 'vac-pdf' });
      return;
    }

    toast.loading('Generando reporte...', { id: 'vac-pdf' });
    try {
      const res = await fetch(`http://localhost:5000/api/vacaciones/${empleadoVacaciones.Id}/imprimir`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Token expirado. Por favor inicia sesión de nuevo.');
      }
      if (res.status === 403) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Acceso denegado. Token inválido.');
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Error al generar PDF');
      }

      const blob = await res.blob();
      window.open(URL.createObjectURL(blob));
      toast.success('Reporte generado', { id: 'vac-pdf' });
    } catch (e) {
      console.error('Error imprimirVacaciones:', e);
      toast.error(e.message || 'Error al generar reporte', { id: 'vac-pdf' });
    }
  };

const cancelarVacacionItem = async (vacacionId) => {
  try {
    await api.put(`/vacaciones/${empleadoVacaciones.Id}/vacacion/${vacacionId}/cancelar`);
    toast.success('Vacaciones canceladas');
    const v = await cargarVacaciones(empleadoVacaciones.Id);
    setVacaciones(v);
  } catch (e) { toast.error(e.response?.data?.error || 'Error al cancelar'); }
};

const reactivarVacacionItem = async (vacacionId) => {
  try {
    await api.put(`/vacaciones/${empleadoVacaciones.Id}/vacacion/${vacacionId}/reactivar`);
    toast.success('Vacaciones reactivadas');
    const v = await cargarVacaciones(empleadoVacaciones.Id);
    setVacaciones(v);
  } catch (e) { toast.error(e.response?.data?.error || 'Error al reactivar'); }
};



  // Cuando se abren vacaciones y hay preview, actualiza el input Vacaciones (días)
  const abrirVacacionesConPreview = async (emp) => {
    setModalAbierto(false);
    await abrirVacaciones(emp);
    // Cargar preview automático, preferir datos de formulario si el usuario los cambió en el modal de empleado
    const hoy = new Date().toISOString().split('T')[0];
    const diasSolicitados = Number(formVacacion.DiasSolicitados) > 0 ? formVacacion.DiasSolicitados : form.Vacaciones;
    const fechaIngreso = form.FechaIngreso || emp.FechaIngreso;
    const tiempoValor = form.TiempoEnEstadoValor || emp.TiempoEnEstadoValor;
    const tiempoUnidad = form.TiempoEnEstadoUnidad || emp.TiempoEnEstadoUnidad;

    if (!fechaIngreso) {
      setPreviewVacacion(null);
      return;
    }

    let url = `/vacaciones/${emp.Id}/preview?FechaInicio=${hoy}`;
    url += `&FechaIngreso=${encodeURIComponent(fechaIngreso)}`;
    if (tiempoValor) url += `&TiempoEnEstadoValor=${encodeURIComponent(tiempoValor)}`;
    if (tiempoUnidad) url += `&TiempoEnEstadoUnidad=${encodeURIComponent(tiempoUnidad)}`;
    if (diasSolicitados) url += `&DiasSolicitados=${diasSolicitados}`;

    try {
      const { data } = await api.get(url);
      setPreviewVacacion(data);
      const nuevoDias = Number(diasSolicitados) > 0 ? Number(diasSolicitados) : data.diasCorresponden;
      setForm(prev => ({ ...prev, Vacaciones: nuevoDias }));
    } catch (e) {
      console.warn('Error en preview vacaciones:', e.response?.data?.error || e.message);
      setPreviewVacacion(null);
    }
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    const errores = validarForm(form);
    if (Object.keys(errores).length > 0) {
      setErroresForm(errores);
      toast.error('Por favor corrige los errores del formulario');
      return;
    }
    setGuardando(true);
    try {
      if (modoEdicion) {
        await api.put(`/empleados/${empleadoSeleccionado.Id}`, form);
        toast.success('Empleado actualizado correctamente');
      } else {
        await api.post('/empleados', form);
        toast.success('Empleado creado correctamente');
      }
      setModalAbierto(false);
      setErroresForm({});
      cargarEmpleados(buscar);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = (emp) => { setEmpleadoAEliminar(emp); setModalEliminar(true); };

  const confirmarEliminar = async () => {
    try {
      await api.delete(`/empleados/${empleadoAEliminar.Id}`);
      toast.success('Empleado eliminado');
      setModalEliminar(false);
      setEmpleadoAEliminar(null);
      cargarEmpleados(buscar);
    } catch { toast.error('Error al eliminar el empleado'); }
  };

  const cargarHistorial = async (empleadoId) => {
    setLoadingHistorial(true);
    try {
      const { data } = await api.get(`/historial/${empleadoId}`);
      setHistorial(data.historial);
      const resFechas = await api.get(`/historial/${empleadoId}/fechas`);
      setFechasHistorial(resFechas.data.fechas);
    } catch {
      toast.error('Error al cargar historial');
    } finally {
      setLoadingHistorial(false);
    }
  };

  const abrirHistorial = async (emp) => {
    setEmpleadoHistorial(emp);
    setModalHistorial(true);
    setFechaFiltroHistorial('');
    setHistorialSeleccionado([]);
    setSelectAllHistorial(false);
    await cargarHistorial(emp.Id);
  };

  const eliminarRegistroHistorial = async (historialId) => {
    try {
      await api.delete(`/historial/${historialId}`);
      toast.success('Registro de historial eliminado');
      if (empleadoHistorial) await cargarHistorial(empleadoHistorial.Id);
      setHistorialSeleccionado([]);
      setSelectAllHistorial(false);
    } catch {
      toast.error('Error eliminando historial');
    }
  };

  const eliminarHistorialSeleccionado = async () => {
    if (!historialSeleccionado.length) return toast.error('Selecciona al menos un registro para eliminar');
    if (!window.confirm(`¿Eliminar ${historialSeleccionado.length} registro(s) de historial? Esta acción no se puede deshacer.`)) return;
    try {
      await api.post(`/historial/empleado/${empleadoHistorial.Id}/bulk`, { ids: historialSeleccionado });
      toast.success('Registros del historial eliminados');
      await cargarHistorial(empleadoHistorial.Id);
      setHistorialSeleccionado([]);
      setSelectAllHistorial(false);
    } catch {
      toast.error('Error eliminando registros del historial');
    }
  };

  const toggleSeleccionRegistro = (id) => {
    setHistorialSeleccionado(prev => {
      const existe = prev.includes(id);
      const nuevo = existe ? prev.filter(x => x !== id) : [...prev, id];
      setSelectAllHistorial(nuevo.length > 0 && nuevo.length === (fechaFiltroHistorial ? historial.filter(h => new Date(h.FechaHora).toISOString().slice(0,10) === fechaFiltroHistorial).length : historial.length));
      return nuevo;
    });
  };

  const toggleSeleccionarTodoHistorial = () => {
    if (selectAllHistorial) {
      setHistorialSeleccionado([]);
      setSelectAllHistorial(false);
    } else {
      const visibleIds = (fechaFiltroHistorial ? historial.filter(h => new Date(h.FechaHora).toISOString().slice(0,10) === fechaFiltroHistorial) : historial)
        .map(h => h.Id);
      setHistorialSeleccionado(visibleIds);
      setSelectAllHistorial(true);
    }
  };

  const eliminarTodosHistorial = async () => {
    if (!empleadoHistorial) return;
    if (!window.confirm('¿Eliminar todo el historial de este empleado? Esta acción es irreversible.')) return;
    try {
      await api.delete(`/historial/empleado/${empleadoHistorial.Id}`);
      toast.success('Historial completo eliminado');
      await cargarHistorial(empleadoHistorial.Id);
      setHistorialSeleccionado([]);
      setSelectAllHistorial(false);
    } catch {
      toast.error('Error eliminando todo el historial');
    }
  };

  const generarConstancia = async (emp, tipo) => {
    try {
      toast.loading('Generando constancia...', { id: 'pdf' });
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) throw new Error('No token de sesión disponible');
      const response = await fetch(`http://localhost:5000/api/constancias/${emp.Id}?tipo=${tipo}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `constancia_${tipo}_${emp.Nombre}_${emp.Apellidos}.pdf`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('PDF descargado', { id: 'pdf' });
    } catch { toast.error('Error al generar el PDF', { id: 'pdf' }); }
  };

  const generarReporte = async () => {
    setGenerandoReporte(true);
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) throw new Error('No token de sesión disponible');
      const params = new URLSearchParams();
      Object.entries(filtrosReporte).forEach(([k, v]) => { if (v) params.append(k, v); });
      const res = await fetch(`http://localhost:5000/api/reporte?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob));
    } catch { toast.error('Error al generar reporte'); }
    finally { setGenerandoReporte(false); }
  };

  const empleadosFiltrados = empleados.filter(e => {
    if (filtroEstatus && e.Estatus !== filtroEstatus) return false;
    if (filtros.cargo && !e.CargoActual?.toLowerCase().includes(filtros.cargo.toLowerCase())) return false;
    if (filtros.salarioMin && Number(e.SalarioActual) < Number(filtros.salarioMin)) return false;
    if (filtros.salarioMax && Number(e.SalarioActual) > Number(filtros.salarioMax)) return false;
    if (filtros.grupoOcupacional && !e.GrupoOcupacional?.toLowerCase().includes(filtros.grupoOcupacional.toLowerCase())) return false;
    if (filtros.AFP && e.AFP !== filtros.AFP) return false;
    if (filtros.ARS && e.ARS !== filtros.ARS) return false;
    if (filtros.fechaDesde && new Date(e.FechaIngreso) < new Date(filtros.fechaDesde)) return false;
    if (filtros.fechaHasta && new Date(e.FechaIngreso) > new Date(filtros.fechaHasta)) return false;
    return true;
  });

  const totalPaginas = Math.ceil(empleadosFiltrados.length / ITEMS_POR_PAGINA);
  const empleadosPaginados = empleadosFiltrados.slice((paginaActual - 1) * ITEMS_POR_PAGINA, paginaActual * ITEMS_POR_PAGINA);
  const handleBuscar = (valor) => { setBuscar(valor); setPaginaActual(1); };
  const handleFiltroEstatus = (valor) => { setFiltroEstatus(valor); setPaginaActual(1); };

  const pillsFiltro = [
    { valor: '', label: 'Todos', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
    { valor: 'Activo', label: 'Activo', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
    { valor: 'Inactivo', label: 'Inactivo', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> },
    { valor: 'Suspendido', label: 'Suspendido', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/></svg> },
    { valor: 'Vacaciones', label: 'Vacaciones', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 18a5 5 0 00-10 0"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/></svg> },
  ];

  const ListaVacaciones = ({ lista }) => (
  lista.length === 0 ? (
    <p style={{ fontSize: '13px', color: '#aaa', textAlign: 'center', padding: '16px' }}>
      No hay vacaciones registradas.
    </p>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {lista.map(v => (
        <div
          key={v.Id}
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          {/* ICONO VACACIONES SVG */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* sol */}
              <circle cx="17" cy="7" r="3" />
              {/* montaña / isla */}
              <path d="M3 20l6-8 4 5 3-4 5 7H3z" />
            </svg>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a2744' }}>
              {fmtFecha(v.FechaInicio)}
              <span style={{ color: '#888', fontWeight: '400', margin: '0 6px' }}>→</span>
              {fmtFecha(v.FechaFin)}
            </div>

            <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>
              {v.DiasCorresponden} días · {v.AniosServicio} años de servicio
              {v.Observaciones && ` · ${v.Observaciones}`}
              {(v.Estado || (v.Cancelada ? 'Cancelada' : '')) &&
                ` · ${v.Estado ? v.Estado : v.Cancelada ? 'Cancelada' : ''}`}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
);

  const historialFiltrado = fechaFiltroHistorial
    ? historial.filter(h => new Date(h.FechaHora).toISOString().slice(0,10) === fechaFiltroHistorial)
    : historial;

  const cantidadHistorialSeleccionado = historialSeleccionado.length;

  return (
    <div style={s.pagina}>
      <Navbar />
      <div style={s.contenido}>

        <div style={s.encabezado}>
          <div>
            <h2 style={s.titulo}>Gestión de Empleados</h2>
            <p style={s.subtitulo}>{empleados.length} empleado(s) encontrado(s)</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={s.btnReporte} onClick={() => setModalReporte(true)}>Reporte General</button>
            <button style={s.btnCrear} onClick={abrirModalCrear}>+ Nuevo Empleado</button>
          </div>
        </div>

        <div style={s.barraFiltros}>
          <input type="text" placeholder="🔍  Buscar por nombre, cédula, expediente..." value={buscar} onChange={(e) => handleBuscar(e.target.value)} style={s.buscador} />
          <div style={s.filtrosPills}>
            {pillsFiltro.map(op => (
              <button key={op.valor} style={{ ...s.pillBtn, ...(filtroEstatus === op.valor ? s.pillActivo : {}) }} onClick={() => handleFiltroEstatus(op.valor)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{op.icon}{op.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <button style={{ ...s.pillBtn, ...(filtrosAvanzados ? s.pillActivo : {}) }} onClick={() => setFiltrosAvanzados(!filtrosAvanzados)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              Filtros avanzados {Object.values(filtros).some(v => v) ? '●' : ''}
            </span>
          </button>
          {Object.values(filtros).some(v => v) && (
            <button style={{ ...s.pillBtn, marginLeft: '8px', color: '#ef4444', borderColor: '#ef4444' }}
              onClick={() => setFiltros({ cargo: '', salarioMin: '', salarioMax: '', fechaDesde: '', fechaHasta: '', grupoOcupacional: '', AFP: '', ARS: '' })}>
              ✕ Limpiar filtros
            </button>
          )}
        </div>

        {filtrosAvanzados && (
          <div style={s.filtrosPanel}>
            <div style={s.filtrosGrid}>
              <div style={s.filtroGrupo}><label style={s.filtroLabel}>Cargo</label><input style={s.filtroInput} placeholder="Ej: Analista..." value={filtros.cargo} onChange={e => setFiltros({...filtros, cargo: e.target.value})} /></div>
              <div style={s.filtroGrupo}><label style={s.filtroLabel}>Salario mínimo</label><input style={s.filtroInput} type="number" placeholder="0" value={filtros.salarioMin} onChange={e => setFiltros({...filtros, salarioMin: e.target.value})} /></div>
              <div style={s.filtroGrupo}><label style={s.filtroLabel}>Salario máximo</label><input style={s.filtroInput} type="number" placeholder="999999" value={filtros.salarioMax} onChange={e => setFiltros({...filtros, salarioMax: e.target.value})} /></div>
              <div style={s.filtroGrupo}><label style={s.filtroLabel}>Ingreso desde</label><input style={s.filtroInput} type="date" value={filtros.fechaDesde} onChange={e => setFiltros({...filtros, fechaDesde: e.target.value})} /></div>
              <div style={s.filtroGrupo}><label style={s.filtroLabel}>Ingreso hasta</label><input style={s.filtroInput} type="date" value={filtros.fechaHasta} onChange={e => setFiltros({...filtros, fechaHasta: e.target.value})} /></div>
              <div style={s.filtroGrupo}><label style={s.filtroLabel}>Grupo Ocupacional</label><input style={s.filtroInput} placeholder="Ej: Técnico..." value={filtros.grupoOcupacional} onChange={e => setFiltros({...filtros, grupoOcupacional: e.target.value})} /></div>
              <div style={s.filtroGrupo}><label style={s.filtroLabel}>AFP</label><input style={s.filtroInput} placeholder="Ej: AFP Popular..." value={filtros.AFP} onChange={e => setFiltros({...filtros, AFP: e.target.value})} /></div>
              <div style={s.filtroGrupo}><label style={s.filtroLabel}>ARS</label><input style={s.filtroInput} placeholder="Ej: ARS Humano..." value={filtros.ARS} onChange={e => setFiltros({...filtros, ARS: e.target.value})} /></div>
            </div>
          </div>
        )}

        <div style={s.tablaContenedor}>
          {loading ? <p style={s.cargando}>Cargando empleados...</p> : empleados.length === 0 ? <p style={s.cargando}>No se encontraron empleados.</p> : (
            <table style={s.tabla}>
              <thead>
                <tr>{['N° RH','Cédula','Nombre','Apellidos','Cargo Actual','Estatus','Acciones'].map(col => <th key={col} style={s.th}>{col}</th>)}</tr>
              </thead>
              <tbody>
                {empleadosPaginados.map((emp, i) => (
                  <tr key={emp.Id} style={i % 2 === 0 ? s.trPar : s.trImpar}>
                    <td style={s.td}>{emp.NumeroRH || '—'}</td>
                    <td style={s.td}>{emp.Cedula}</td>
                    <td style={s.td}>{emp.Nombre}</td>
                    <td style={s.td}>{emp.Apellidos}</td>
                    <td style={s.td}>{emp.CargoActual || '—'}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge,
                        backgroundColor: emp.Estatus === 'Activo' ? '#eafaf1' : emp.Estatus === 'Inactivo' ? '#fdf2f2' : emp.Estatus === 'Suspendido' ? '#fff7ed' : '#eff6ff',
                        color: emp.Estatus === 'Activo' ? '#27ae60' : emp.Estatus === 'Inactivo' ? '#e74c3c' : emp.Estatus === 'Suspendido' ? '#f97316' : '#3b82f6',
                      }}>{emp.Estatus}</span>
                    </td>
                    <td style={s.td}>
                      <div style={s.acciones}>
                        <button style={s.btnVer} onClick={() => abrirModalVer(emp)}>Ver</button>
                        {/* Nuevo botón de Anexos */}
                        <button style={s.btnAnexos} onClick={() => abrirModalAnexos(emp)}>Anexos</button>
                        <button style={s.btnEditar} onClick={() => abrirModalEditar(emp)}>Editar</button>
                        <select style={s.selectConstancia} defaultValue="" onChange={(e) => { if (e.target.value) { generarConstancia(emp, e.target.value); e.target.value = ''; } }}>
                          <option value="" disabled>📄 PDF</option>
                          <option value="carta">Carta de Trabajo</option>
                          <option value="expediente">Expediente Completo</option>
                        </select>
                        <button style={s.btnHistorial} onClick={() => abrirHistorial(emp)}>Historial</button>
                        <button style={s.btnEliminar} onClick={() => handleEliminar(emp)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {totalPaginas > 1 && (
        <div style={s.paginacion}>
          <button style={{ ...s.btnPag, opacity: paginaActual === 1 ? 0.4 : 1 }} onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}>← Anterior</button>
          <div style={s.pagNumeros}>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPaginas || Math.abs(n - paginaActual) <= 1)
              .reduce((acc, n, idx, arr) => { if (idx > 0 && n - arr[idx - 1] > 1) acc.push('...'); acc.push(n); return acc; }, [])
              .map((item, idx) => item === '...' ? <span key={`dots-${idx}`} style={s.pagDots}>...</span> : (
                <button key={item} style={{ ...s.btnPagNum, ...(item === paginaActual ? s.btnPagActivo : {}) }} onClick={() => setPaginaActual(item)}>{item}</button>
              ))}
          </div>
          <button style={{ ...s.btnPag, opacity: paginaActual === totalPaginas ? 0.4 : 1 }} onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>Siguiente →</button>
        </div>
      )}

      {/* ── MODAL CREAR / EDITAR ── */}
      {modalAbierto && (
        <div style={s.overlay}>
          <div style={s.modalGrande} className="modal-scroll">
            <div style={s.modalHeader}>
              <h3 style={s.modalTitulo}>{modoEdicion ? 'Editar Empleado' : 'Nuevo Empleado'}</h3>
              <button style={s.btnCerrar} onClick={() => setModalAbierto(false)}>✕</button>
            </div>
            <form onSubmit={handleGuardar} style={s.modalForm}>
              <div style={s.formGrid}>
                <p style={s.seccion}>Información Personal</p>
                <Campo label="Número RH" name="NumeroRH" value={form.NumeroRH} onChange={handleChange} />
                <Campo label="Cédula" name="Cedula" value={form.Cedula} onChange={handleChange} required error={erroresForm.Cedula} />
                <Campo label="Nombre" name="Nombre" value={form.Nombre} onChange={handleChange} required error={erroresForm.Nombre} />
                <Campo label="Apellidos" name="Apellidos" value={form.Apellidos} onChange={handleChange} required error={erroresForm.Apellidos} />
                <Campo label="Correo" name="Correo" type="email" value={form.Correo} onChange={handleChange} error={erroresForm.Correo} />
                <Campo label="Fecha Nacimiento" name="FechaNacimiento" type="date" value={form.FechaNacimiento} onChange={handleChange} />
                <Campo label="Edad" name="Edad" type="number" value={form.Edad} onChange={handleChange} error={erroresForm.Edad} />
                <div style={s.campoContenedor}>
                  <label style={s.label}>Sexo</label>
                  <select name="Sexo" value={form.Sexo} onChange={handleChange} style={s.input}>
                    <option value="">Seleccionar...</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                  </select>
                </div>
                <Campo label="Teléfono" name="NumeroTelefonico" value={form.NumeroTelefonico} onChange={handleChange} />
                <Campo label="Expediente" name="Expediente" value={form.Expediente} onChange={handleChange} />

                <p style={s.seccion}>Información Laboral</p>
                <Campo label="Fecha Ingreso" name="FechaIngreso" type="date" value={form.FechaIngreso} onChange={handleChange} />
                <div style={s.campoContenedor}>
                  <label style={s.label}>Tiempo en estado</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      name="TiempoEnEstadoValor"
                      value={form.TiempoEnEstadoValor}
                      onChange={handleChange}
                      min="0"
                      style={{ ...s.input, width: '110px' }}
                      placeholder="Cantidad"
                    />
                    <select
                      name="TiempoEnEstadoUnidad"
                      value={form.TiempoEnEstadoUnidad}
                      onChange={handleChange}
                      style={{ ...s.input, width: '110px' }}
                    >
                      <option value="años">Años</option>
                      <option value="meses">Meses</option>
                    </select>
                  </div>
                </div>
                <Campo label="Fecha Salida" name="FechaSalida" type="date" value={form.FechaSalida} onChange={handleChange} />
                <Campo label="Grupo Ocupacional" name="GrupoOcupacional" value={form.GrupoOcupacional} onChange={handleChange} />
                <Campo label="AFP" name="AFP" value={form.AFP} onChange={handleChange} />
                <Campo label="ARS" name="ARS" value={form.ARS} onChange={handleChange} />

                {/* Vacaciones (días) + botón Ver sin emoji */}
                <div style={s.campoContenedor}>
                  <label style={s.label}>Vacaciones (días)</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="number" name="Vacaciones" value={form.Vacaciones} readOnly style={{ ...s.input, flex: 1, backgroundColor: '#f4f5f7', cursor: 'not-allowed' }} />
                    {modoEdicion && (
                      <button type="button"
                        style={{ padding: '10px 14px', borderRadius: '7px', border: 'none', backgroundColor: '#0f766e', color: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        onClick={() => abrirVacacionesConPreview(empleadoSeleccionado)}>
                        Ver
                      </button>
                    )}
                  </div>
                </div>

                <Campo label="Licencias Médicas" name="LicenciasMedicas" type="number" value={form.LicenciasMedicas} onChange={handleChange} />
                <Campo label="Faltas" name="Faltas" type="number" value={form.Faltas} onChange={handleChange} />
                <div style={s.campoContenedor}>
                  <label style={s.label}>Estatus</label>
                  <select name="Estatus" value={form.Estatus} onChange={handleChange} style={s.input}>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                    <option value="Suspendido">Suspendido</option>
                    <option value="Vacaciones">Vacaciones</option>
                  </select>
                </div>

                <p style={s.seccion}>Cargos y Salarios</p>
                <Campo label="Cargo Inicial" name="CargoInicial" value={form.CargoInicial} onChange={handleChange} />
                <Campo label="Salario Inicial" name="SalarioInicial" type="number" value={form.SalarioInicial} onChange={handleChange} />
                <Campo label="Cargo Actual" name="CargoActual" value={form.CargoActual} onChange={handleChange} />
                <Campo label="Salario Actual" name="SalarioActual" type="number" value={form.SalarioActual} onChange={handleChange} />
                <Campo label="Itinerario" name="Itinerario" value={form.Itinerario} onChange={handleChange} />
                <Campo label="Salario Itinerario" name="SalarioItinerario" type="number" value={form.SalarioItinerario} onChange={handleChange} />
                <Campo label="Salario Total" name="SalarioTotal" type="number" value={form.SalarioTotal} onChange={handleChange} readOnly />

              </div>
              <div style={s.modalFooter}>
                <button type="button" style={s.btnCancelar} onClick={() => setModalAbierto(false)}>Cancelar</button>
                <button type="submit" style={s.btnGuardar} disabled={guardando}>{guardando ? 'Guardando...' : modoEdicion ? 'Actualizar' : 'Crear Empleado'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

         {/* ── MODAL VER DETALLE ── */}
      {modalVerAbierto && empleadoVer && (
        <div style={s.overlay}>
          <div style={s.modalGrande} className="modal-scroll">
            <div style={s.modalHeader}>
              <h3 style={s.modalTitulo}>{empleadoVer.Nombre} {empleadoVer.Apellidos}</h3>
              <button style={s.btnCerrar} onClick={() => setModalVerAbierto(false)}>✕</button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {(() => {
                const ingresoAnios = calcularAnios(empleadoVer.FechaIngreso);
                const estValor = Number(empleadoVer.TiempoEnEstadoValor || 0);
                const estUnidad = (empleadoVer.TiempoEnEstadoUnidad || 'años').toLowerCase();
                const estadoAnios = estUnidad === 'meses' ? Math.floor(estValor / 12) : Math.floor(estValor);
                const totalAnios = ingresoAnios + estadoAnios;

                return [
                  ['N° RH', empleadoVer.NumeroRH], ['Cédula', empleadoVer.Cedula], ['Sexo', empleadoVer.Sexo],
                  ['Fecha Nacimiento', empleadoVer.FechaNacimiento?.split('T')[0]], ['Edad', empleadoVer.Edad],
                  ['Teléfono', empleadoVer.Telefono], ['Correo', empleadoVer.Correo], ['Expediente', empleadoVer.Expediente],
                  ['Fecha ingreso', empleadoVer.FechaIngreso?.split('T')[0]],
                  ['Tiempo en estado', `${estValor} ${empleadoVer.TiempoEnEstadoUnidad || 'años'}`],
                  ['Fecha Salida', empleadoVer.FechaSalida?.split('T')[0]],
                  ['Grupo Ocupacional', empleadoVer.GrupoOcupacional], ['AFP', empleadoVer.AFP], ['ARS', empleadoVer.ARS],
                  ['Vacaciones', empleadoVer.Vacaciones + ' días'], ['Licencias Médicas', empleadoVer.LicenciasMedicas + ' días'],
                  ['Faltas', empleadoVer.Faltas], ['Estatus', empleadoVer.Estatus], ['Cargo Inicial', empleadoVer.CargoInicial],
                  ['Salario Inicial', `RD$ ${Number(empleadoVer.SalarioInicial || 0).toLocaleString()}`],
                  ['Cargo Actual', empleadoVer.CargoActual], ['Salario Actual', `RD$ ${Number(empleadoVer.SalarioActual || 0).toLocaleString()}`],
                  ['Itinerario', empleadoVer.Itinerario], ['Salario Itinerario', `RD$ ${Number(empleadoVer.SalarioItinerario || 0).toLocaleString()}`],
                  ['Salario Total', `RD$ ${Number(empleadoVer.SalarioTotal || 0).toLocaleString()}`],
                ].map(([label, valor]) => (
                  <div key={label} style={s.verFila}>
                    <span style={s.verLabel}>{label}</span>
                    <span style={s.verValor}>{valor || '—'}</span>
                  </div>
                ))
              })()}

              <div style={{ marginTop: '20px' }}>
                <p style={{ fontSize: '13px', fontWeight: '700', color: '#1a2744', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '2px solid #eef1f8', paddingBottom: '8px', marginBottom: '12px' }}>Historial de Vacaciones</p>
                <ListaVacaciones lista={vacacionesVer} />
              </div>
            </div>
            <div style={s.modalFooter}>
              <button style={s.btnGuardar} onClick={() => { setModalVerAbierto(false); abrirModalEditar(empleadoVer); }}>Editar</button>
              <button style={s.btnCancelar} onClick={() => setModalVerAbierto(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE ANEXOS INDEPENDIENTE ── */}
      {modalAnexosIndependiente && empleadoAnexos && (
        <div style={s.overlay}>
          <div style={{ ...s.modalGrande, maxWidth: '1000px' }} className="modal-scroll">
            <div style={s.modalHeader}>
              <div>
                <h3 style={s.modalTitulo}>Anexos de {empleadoAnexos.Nombre} {empleadoAnexos.Apellidos}</h3>
                <p style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>{empleadoAnexos.NumeroRH} · {empleadoAnexos.Cedula}</p>
              </div>
              <button style={s.btnCerrar} onClick={() => setModalAnexosIndependiente(false)}>✕</button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <div style={{ marginBottom: '24px', backgroundColor: '#f8fafc', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#1a2744', marginBottom: '16px' }}>📎 Subir nuevo anexo</p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={s.filtroLabel}>Tipo de documento</label>
                    <input type="text" placeholder="Ej: Cédula, Contrato, Carta..." value={tipoAnexo} onChange={e => setTipoAnexo(e.target.value)} style={{ ...s.filtroInput, width: '100%' }} />
                  </div>
                  <label style={{ ...s.btnSubirAnexo, padding: '10px 24px', marginBottom: '0', opacity: !tipoAnexo.trim() ? 0.5 : 1, cursor: !tipoAnexo.trim() ? 'not-allowed' : 'pointer' }}>
                    {subiendoAnexo ? 'Subiendo...' : '+ Subir Documento'}
                    <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" style={{ display: 'none' }} disabled={subiendoAnexo || !tipoAnexo.trim()} onChange={(e) => subirAnexo(e, empleadoAnexos.Id)} />
                  </label>
                </div>
                <p style={{ fontSize: '11px', color: '#888', marginTop: '10px' }}>Formatos aceptados: PDF, Word, PNG, JPG · Cualquier tamaño</p>
              </div>

              {anexosEmpleado.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#aaa', textAlign: 'center', padding: '40px' }}>No hay anexos para este empleado.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {anexosEmpleado.map(a => {
                    const esImagen = ['.png', '.jpg', '.jpeg'].includes(a.TipoArchivo);
                    const esPDF = a.TipoArchivo === '.pdf';
                    const url = `http://localhost:5000/api/anexos/ver/${a.NombreArchivo}`;
                    return (
                      <div key={a.Id} style={s.anexoCard}>
                        <div style={s.anexoThumb} onClick={() => abrirAnexo(a.NombreArchivo)}>
                          {esImagen ? <img src={url} alt={a.NombreOriginal} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : esPDF ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px' }}>
                                <span style={{ fontSize: '48px' }}>📄</span>
                                <span style={{ fontSize: '11px', color: '#727272', fontWeight: '700' }}>PDF</span>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px' }}>
                                <span style={{ fontSize: '36px' }}>{iconoAnexo(a.TipoArchivo)}</span>
                                <span style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', fontWeight: '700' }}>{a.TipoArchivo.replace('.', '')}</span>
                              </div>
                            )}
                        </div>
                        <div style={s.anexoCardInfo}>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a2744' }}>{a.TipoDocumento || 'Sin tipo'}</div>
                          <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{a.NombreOriginal}</div>
                          <div style={{ fontSize: '10px', color: '#aaa', marginTop: '2px' }}>{new Date(a.FechaSubida).toLocaleDateString('es-DO')}</div>
                        </div>
                        <div style={s.anexoCardBtns}>
                          <button style={s.btnVerAnexo} onClick={() => abrirAnexo(a.NombreArchivo)}>Ver</button>
                          {esImagen && <button style={s.btnImprimirAnexo} onClick={() => { const win = window.open(url, '_blank'); win.onload = () => win.print(); }}>Imprimir</button>}
                          <button style={s.btnEliminarAnexo} onClick={() => setModalConfirmarAnexo({ id: a.Id, empleadoId: empleadoAnexos.Id, nombre: a.TipoDocumento || a.NombreOriginal, tipo: 'independiente' })}>Eliminar</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div style={s.modalFooter}>
              <button style={s.btnCancelar} onClick={() => setModalAnexosIndependiente(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL VACACIONES ── */}
      {modalVacaciones && empleadoVacaciones && (
        <div style={s.overlay}>
          <div style={{ ...s.modalGrande, maxWidth: '700px' }} className="modal-scroll">
            <div style={{ ...s.modalHeader, alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={s.modalTitulo}>Vacaciones</h3>
                <p style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>{empleadoVacaciones.Nombre} {empleadoVacaciones.Apellidos} · {empleadoVacaciones.NumeroRH}</p>
              </div>
            </div>
           <div style={{ display: 'flex', gap: '10px', padding: '12px 28px 4px' }}>
  <button style={{
    padding: '9px 16px', borderRadius: '99px', border: 'none',
    backgroundColor: '#0f766e', color: 'white', fontSize: '13px',
    fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap'
  }} onClick={imprimirVacaciones}>
    Imprimir
  </button>
  <button style={{
    padding: '9px 16px', borderRadius: '99px', border: 'none',
    backgroundColor: '#0f766e', color: 'white', fontSize: '13px',
    fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap'
  }} onClick={abrirVacacionesAnuales}>
    Ver Vacaciones Anuales
  </button>
</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', marginRight: '16px' }}>
              <button style={s.btnCerrar} onClick={() => setModalVacaciones(false)}>✕</button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', padding: '20px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '13px', fontWeight: '700', color: '#1a2744', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Registrar Nuevo Período</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div style={s.filtroGrupo}>
                    <label style={s.filtroLabel}>Fecha de Inicio</label>
                    <input type="date" style={s.filtroInput} value={formVacacion.FechaInicio}
                      onChange={e => {
                        setFormVacacion({ ...formVacacion, FechaInicio: e.target.value });
                        calcularPreviewVacacion(e.target.value, empleadoVacaciones.Id, formVacacion.DiasSolicitados);
                      }} />
                  </div>
                  <div style={s.filtroGrupo}>
                    <label style={s.filtroLabel}>Días solicitados</label>
                    <input type="number" min="1" style={s.filtroInput} placeholder="Ej: 5" value={formVacacion.DiasSolicitados}
                      onChange={e => {
                        setFormVacacion({ ...formVacacion, DiasSolicitados: e.target.value });
                        calcularPreviewVacacion(formVacacion.FechaInicio, empleadoVacaciones.Id, e.target.value);
                      }} />
                  </div>
                  <div style={s.filtroGrupo}>
                    <label style={s.filtroLabel}>Observaciones</label>
                    <input type="text" style={s.filtroInput} placeholder="Opcional..." value={formVacacion.Observaciones} onChange={e => setFormVacacion({ ...formVacacion, Observaciones: e.target.value })} />
                  </div>
                </div>
                {previewVacacion && (
                  <div style={{ marginTop: '14px', backgroundColor: '#ecfdf5', borderRadius: '8px', padding: '14px 16px', border: '1px solid #6ee7b7' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px' }}>
                      <div><span style={{ fontSize: '11px', color: '#059669', fontWeight: '700', textTransform: 'uppercase' }}>Años desde ingreso</span><div style={{ fontSize: '18px', fontWeight: '800', color: '#065f46' }}>{previewVacacion.aniosIngreso ?? 0}</div></div>
                      <div><span style={{ fontSize: '11px', color: '#059669', fontWeight: '700', textTransform: 'uppercase' }}>Años en el estado</span><div style={{ fontSize: '18px', fontWeight: '800', color: '#065f46' }}>{previewVacacion.aniosEstado ?? 0}</div></div>
                      <div><span style={{ fontSize: '11px', color: '#059669', fontWeight: '700', textTransform: 'uppercase' }}>Años totales</span><div style={{ fontSize: '18px', fontWeight: '800', color: '#065f46' }}>{previewVacacion.aniosServicio ?? 0}</div></div>
                      <div><span style={{ fontSize: '11px', color: '#059669', fontWeight: '700', textTransform: 'uppercase' }}>Tope anual</span><div style={{ fontSize: '18px', fontWeight: '800', color: '#065f46' }}>{previewVacacion.diasCorresponden}</div></div>
                      <div><span style={{ fontSize: '11px', color: '#059669', fontWeight: '700', textTransform: 'uppercase' }}>Días tomados</span><div style={{ fontSize: '18px', fontWeight: '800', color: '#065f46' }}>{previewVacacion.diasTomados}</div></div>
                      <div><span style={{ fontSize: '11px', color: '#059669', fontWeight: '700', textTransform: 'uppercase' }}>Días disponibles</span><div style={{ fontSize: '18px', fontWeight: '800', color: '#065f46' }}>{previewVacacion.diasDisponibles}</div></div>
                      <div><span style={{ fontSize: '11px', color: '#059669', fontWeight: '700', textTransform: 'uppercase' }}>Días solicitados</span><div style={{ fontSize: '18px', fontWeight: '800', color: '#065f46' }}>{previewVacacion.diasSeleccionados}</div></div>
                      <div><span style={{ fontSize: '11px', color: '#059669', fontWeight: '700', textTransform: 'uppercase' }}>Fecha de regreso</span><div style={{ fontSize: '18px', fontWeight: '800', color: '#065f46' }}>{previewVacacion.fechaFin ? fmtFecha(previewVacacion.fechaFin) : 'Pendiente de seleccionar días'}</div></div>
                    </div>
                    {previewVacacion.mensaje && <p style={{ marginTop: '10px', fontSize: '12px', color: '#064e3b' }}>{previewVacacion.mensaje}</p>}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
                  <button style={{ ...s.btnGuardar, backgroundColor: '#0f766e' }} onClick={guardarVacacion} disabled={guardandoVacacion || !Number(formVacacion.DiasSolicitados) || Number(formVacacion.DiasSolicitados) <= 0}>
                    {guardandoVacacion ? 'Guardando...' : '+ Registrar Vacaciones'}
                  </button>
                </div>
              </div>

              <div>
               <p style={{ fontSize: '13px', fontWeight: '700', color: '#1a2744', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
  Historial {anioActual} · {vacacionesAnoActual.length}/3 períodos
</p>
                {loadingVacaciones ? <p style={s.cargando}>Cargando...</p> : (
                  vacacionesAnoActual.length === 0 ? <p style={{ fontSize: '13px', color: '#aaa', textAlign: 'center', padding: '20px' }}>Año nuevo, no hay períodos en {anioActual}.</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {vacacionesAnoActual.map(v => (
  <div key={v.Id} style={{
    backgroundColor: v.Estado === 'Cancelada' ? '#fef9f9' : v.Estado === 'Programada' ? '#fffbeb' : v.Estado === 'Completada' ? '#f1f5f9' : 'white',
    borderRadius: '10px',
    border: `1px solid ${v.Estado === 'Cancelada' ? '#fecaca' : '#e2e8f0'}`,
    padding: '14px 16px',
    display: 'flex', alignItems: 'center', gap: '14px'
  }}>
    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: v.Estado === 'Cancelada' ? '#fef2f2' : v.Estado === 'Programada' ? '#fffbeb' : v.Estado === 'Completada' ? '#e2e8f5' : '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
      {v.Estado === 'Cancelada' ? '✗' : v.Estado === 'Programada' ? '🕒' : v.Estado === 'Completada' ? '✔️' : '🏖️'}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#1a2744' }}>
          {fmtFecha(v.FechaInicio)}<span style={{ color: '#888', fontWeight: '400', margin: '0 6px' }}>→</span>{fmtFecha(v.FechaFin)}
        </span>
        <span style={{
          padding: '2px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '700',
          backgroundColor: v.Estado === 'Cancelada' ? '#fef2f2' : v.Estado === 'Programada' ? '#fffbeb' : v.Estado === 'Completada' ? '#e2e8f5' : '#ecfdf5',
          color: v.Estado === 'Cancelada' ? '#e74c3c' : v.Estado === 'Programada' ? '#b45309' : v.Estado === 'Completada' ? '#475569' : '#27ae60'
        }}>
          {v.Estado}
        </span>
      </div>
      <div style={{ fontSize: '11px', color: '#888' }}>
        {v.DiasCorresponden} días · {v.AniosServicio} años de servicio
        {v.Observaciones && ` · ${v.Observaciones}`}
        {(v.Estado === 'Cancelada' || v.Cancelada) && v.FechaCancelacion && ` · Cancelada el ${fmtFecha(v.FechaCancelacion)}`}
        {v.Estado === 'Programada' && ' · Programada'}
        {v.Estado === 'Completada' && ' · Completada'}
      </div>
    </div>
    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
     {!v.Cancelada ? (
  <button style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#fff7ed', color: '#f97316', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
    onClick={() => setModalConfirmarCancelarItem(v.Id)}>
    Cancelar
  </button>
) : (
  <button style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#ecfdf5', color: '#27ae60', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
    onClick={() => setModalConfirmarReactivarItem(v.Id)}>
    Activar
  </button>
)}
      <button style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#fdf2f2', color: '#e74c3c', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
        onClick={() => setModalConfirmarEliminarVacacion(v.Id)}>
        Eliminar
      </button>
    </div>
  </div>
))}
                    </div>
                  )
                )}
              </div>
            </div>
            <div style={{...s.modalFooter, justifyContent: 'space-between'}}>
              {/* Botón cancelar vacaciones a la izquierda */}
              <button style={{ ...s.btnCancelar, borderColor: '#f97316', color: '#f97316' }}
                onClick={() => setModalCancelarVacaciones(true)}>
                Cancelar Vacaciones
              </button>
              <button style={s.btnCancelar} onClick={() => setModalVacaciones(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL VACACIONES ANUALES NUEVO ── */}
      {modalVacacionesAnuales && (
        <div style={s.overlay}>
          <div style={{ ...s.modalGrande, maxWidth: '880px' }}>
            <div style={s.modalHeader}>
              <div>
                <h3 style={s.modalTitulo}>Vacaciones Anuales</h3>
                <p style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>Historial dividido por año</p>
              </div>
              <button style={s.btnCerrar} onClick={cerrarVacacionesAnuales}>✕</button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto', maxHeight: '72vh' }}>
              {calcularResumenVacacionesPorAnio().length === 0 ? (
                <p style={{ color: '#888', fontSize: '13px', textAlign: 'center' }}>No hay períodos registrados aún.</p>
              ) : (
                calcularResumenVacacionesPorAnio().map(item => (
                  <div key={item.anio} style={{ marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                    <p style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '700', color: '#1a2744' }}>Año {item.anio} ({item.registros.length}/3 períodos)</p>
                    {item.registros.length === 0 ? (
                      <p style={{ color: '#888', fontSize: '13px' }}>No hay períodos</p>
                    ) : (
                      item.registros.map(v => (
                        <div key={v.Id} style={{ marginBottom: '8px', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '9px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a2744' }}>{fmtFecha(v.FechaInicio)} → {fmtFecha(v.FechaFin)}</div>
                          <div style={{ fontSize: '12px', color: '#444' }}>{v.DiasCorresponden} días · {v.AniosServicio} años servicio · Estado: {v.Estado || (v.Cancelada ? 'Cancelada' : 'Completada')}</div>
                        </div>
                      ))
                    )}
                  </div>
                ))
              )}
            </div>
            <div style={{ ...s.modalFooter, justifyContent: 'flex-end' }}>
              <button style={s.btnCancelar} onClick={cerrarVacacionesAnuales}>Cerrar</button>
            </div>
          </div>
        </div>
      )}



{/* ── MODAL CONFIRMAR CANCELAR VACACIÓN ── */}
{modalConfirmarCancelarItem && (
  <div style={{...s.overlay, zIndex: 1200}}>
    <div style={s.modalEliminar}>
      <div style={s.modalEliminarIcono}>
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
          <circle cx="26" cy="26" r="25" stroke="#f97316" strokeWidth="2"/>
          <line x1="26" y1="15" x2="26" y2="29" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="26" cy="36" r="2" fill="#f97316"/>
        </svg>
      </div>
      <h3 style={{...s.modalEliminarTitulo, color: '#f97316'}}>Cancelar período</h3>
      <p style={s.modalEliminarTexto}>¿Deseas también cambiar el estatus del empleado?</p>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button style={s.btnCancelarEliminar} onClick={() => {
          cancelarVacacionItem(modalConfirmarCancelarItem);
          setModalConfirmarCancelarItem(null);
        }}>Solo cancelar período</button>
        <button style={{ ...s.btnConfirmarEliminar, backgroundColor: '#27ae60' }} onClick={async () => {
          await cancelarVacacionItem(modalConfirmarCancelarItem);
          await cancelarVacaciones('Activo');
          setModalConfirmarCancelarItem(null);
        }}>Cancelar y poner Activo</button>
        <button style={{ ...s.btnConfirmarEliminar, backgroundColor: '#64748b' }} onClick={async () => {
          await cancelarVacacionItem(modalConfirmarCancelarItem);
          await cancelarVacaciones('Inactivo');
          setModalConfirmarCancelarItem(null);
        }}>Cancelar y poner Inactivo</button>
        <button style={{ ...s.btnCancelarEliminar, backgroundColor: '#e5e7eb', color: '#1f2937' }} onClick={() => setModalConfirmarCancelarItem(null)}>Cerrar</button>
      </div>
    </div>
  </div>
)}

{/* ── MODAL CONFIRMAR ACTIVAR VACACIÓN ── */}
{modalConfirmarReactivarItem && (
  <div style={{...s.overlay, zIndex: 1200}}>
    <div style={s.modalEliminar}>
      <div style={s.modalEliminarIcono}>
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
          <circle cx="26" cy="26" r="25" stroke="#0f766e" strokeWidth="2"/>
          <path d="M16 26l7 7 13-13" stroke="#0f766e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h3 style={{...s.modalEliminarTitulo, color: '#0f766e'}}>Activar período</h3>
      <p style={s.modalEliminarTexto}>¿Deseas también cambiar el estatus del empleado a Vacaciones?</p>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button style={s.btnCancelarEliminar} onClick={() => {
          reactivarVacacionItem(modalConfirmarReactivarItem);
          setModalConfirmarReactivarItem(null);
        }}>Solo activar período</button>
        <button style={{ ...s.btnConfirmarEliminar, backgroundColor: '#0f766e' }} onClick={async () => {
          await reactivarVacacionItem(modalConfirmarReactivarItem);
          await cambiarEstatusAVacaciones();
          setModalConfirmarReactivarItem(null);
        }}>Activar y poner Vacaciones</button>
        <button style={{ ...s.btnCancelarEliminar, backgroundColor: '#e5e7eb', color: '#1f2937' }} onClick={() => setModalConfirmarReactivarItem(null)}>Cerrar</button>
      </div>
    </div>
  </div>
)}

{modalConfirmarEliminarVacacion && (
  <div style={{...s.overlay, zIndex: 1200}}>
    <div style={s.modalEliminar}>
      <div style={s.modalEliminarIcono}>
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
          <circle cx="26" cy="26" r="25" stroke="#e74c3c" strokeWidth="2"/>
          <line x1="17" y1="17" x2="35" y2="35" stroke="#e74c3c" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="35" y1="17" x2="17" y2="35" stroke="#e74c3c" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </div>
      <h3 style={{...s.modalEliminarTitulo, color: '#e74c3c'}}>Eliminar período de vacaciones</h3>
      <p style={s.modalEliminarTexto}>¿Estás seguro de que deseas eliminar este período de vacaciones? Esta acción no se puede deshacer.</p>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button style={s.btnCancelarEliminar} onClick={() => setModalConfirmarEliminarVacacion(null)}>Cerrar</button>
        <button style={{ ...s.btnConfirmarEliminar, backgroundColor: '#e74c3c' }} onClick={async () => {
          await eliminarVacacion(modalConfirmarEliminarVacacion);
          setModalConfirmarEliminarVacacion(null);
        }}>Eliminar</button>
      </div>
    </div>
  </div>
)}

      {/* ── MODAL CAMBIAR ESTATUS A VACACIONES ── */}
      {modalCambiarEstatusVac && (
        <div style={{...s.overlay, zIndex: 1100}}>
          <div style={s.modalEliminar}>
            <div style={s.modalEliminarIcono}>
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                <circle cx="26" cy="26" r="25" stroke="#0f766e" strokeWidth="2"/>
                <path d="M16 26l7 7 13-13" stroke="#0f766e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 style={{...s.modalEliminarTitulo, color: '#0f766e'}}>Vacaciones registradas</h3>
            <p style={s.modalEliminarTexto}>
              ¿Deseas cambiar el estatus de <strong>{empleadoVacaciones?.Nombre} {empleadoVacaciones?.Apellidos}</strong> a <strong>Vacaciones</strong>?
            </p>
            <div style={s.modalEliminarBtns}>
              <button style={s.btnCancelarEliminar} onClick={() => setModalCambiarEstatusVac(false)}>No, mantener</button>
              <button style={{ ...s.btnConfirmarEliminar, backgroundColor: '#0f766e' }} onClick={cambiarEstatusAVacaciones}>Sí, cambiar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CANCELAR VACACIONES ── */}
      {modalCancelarVacaciones && (
        <div style={{...s.overlay, zIndex: 1100}}>
          <div style={s.modalEliminar}>
            <div style={s.modalEliminarIcono}>
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                <circle cx="26" cy="26" r="25" stroke="#f97316" strokeWidth="2"/>
                <line x1="26" y1="15" x2="26" y2="29" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="26" cy="36" r="2" fill="#f97316"/>
              </svg>
            </div>
            <h3 style={{...s.modalEliminarTitulo, color: '#f97316'}}>Cancelar Vacaciones</h3>
            <p style={s.modalEliminarTexto}>
              ¿A qué estatus deseas pasar a <strong>{empleadoVacaciones?.Nombre} {empleadoVacaciones?.Apellidos}</strong>?
            </p>
            <div style={s.modalEliminarBtns}>
              <button style={s.btnCancelarEliminar} onClick={() => setModalCancelarVacaciones(false)}>Cancelar</button>
              <button style={{ ...s.btnConfirmarEliminar, backgroundColor: '#27ae60' }} onClick={() => cancelarVacaciones('Activo')}>Activo</button>
              <button style={{ ...s.btnConfirmarEliminar, backgroundColor: '#64748b' }} onClick={() => cancelarVacaciones('Inactivo')}>Inactivo</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIRMAR ELIMINAR ── */}
      {modalEliminar && (
        <div style={s.overlay}>
          <div style={s.modalEliminar}>
            <div style={s.modalEliminarIcono}><svg width="52" height="52" viewBox="0 0 52 52" fill="none"><circle cx="26" cy="26" r="25" stroke="#ef4444" strokeWidth="2"/><line x1="26" y1="15" x2="26" y2="29" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/><circle cx="26" cy="36" r="2" fill="#ef4444"/></svg></div>
            <h3 style={s.modalEliminarTitulo}>¿Eliminar empleado?</h3>
            <p style={s.modalEliminarTexto}>Estás a punto de eliminar a <strong>{empleadoAEliminar?.Nombre} {empleadoAEliminar?.Apellidos}</strong>. Esta acción no se puede deshacer.</p>
            <div style={s.modalEliminarBtns}>
              <button style={s.btnCancelarEliminar} onClick={() => { setModalEliminar(false); setEmpleadoAEliminar(null); }}>Cancelar</button>
              <button style={s.btnConfirmarEliminar} onClick={confirmarEliminar}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL HISTORIAL ── */}
      {modalHistorial && empleadoHistorial && (
        <div style={s.overlay}>
          <div style={s.modalGrande} className="modal-scroll">
            <div style={s.modalHeader}>
              <div>
                <h3 style={s.modalTitulo}>Historial de Cambios</h3>
                <p style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>{empleadoHistorial.Nombre} {empleadoHistorial.Apellidos} · {empleadoHistorial.NumeroRH}</p>
              </div>
              <button style={s.btnCerrar} onClick={() => setModalHistorial(false)}>✕</button>
            </div>
            <div style={{ padding: '24px', overflowX: 'hidden', maxHeight: '60vh', overflowY: 'auto' }}>
              {loadingHistorial ? <p style={s.cargando}>Cargando historial...</p> : historialFiltrado.length === 0 ? <p style={s.cargando}>No hay cambios registrados.</p> : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button style={s.btnGuardar} onClick={toggleSeleccionarTodoHistorial}>{selectAllHistorial ? 'Deseleccionar todo' : 'Seleccionar todo'}</button>
                      <button style={s.btnEliminar} onClick={eliminarHistorialSeleccionado} disabled={!cantidadHistorialSeleccionado}>Eliminar seleccionados</button>
                      <button style={s.btnEliminar} onClick={eliminarTodosHistorial}>Eliminar todo</button>
                    </div>
                    <div style={{ fontSize: '13px', color: '#888' }}>{cantidadHistorialSeleccionado} seleccionado(s) / {historialFiltrado.length} visibles</div>
                  </div>
                  <table style={{...s.tabla, tableLayout: 'fixed', width: '100%'}}>
                  <thead>
                    <tr>
                      <th style={{...s.th, width: '40px'}}><input type="checkbox" checked={selectAllHistorial} onChange={toggleSeleccionarTodoHistorial}/></th>
                      <th style={{...s.th, width: '180px'}}>Fecha y Hora</th>
                      <th style={{...s.th, width: '120px'}}>Campo</th>
                      <th style={{...s.th, width: '180px'}}>Valor Anterior</th>
                      <th style={{...s.th, width: '180px'}}>Valor Nuevo</th>
                      <th style={{...s.th, width: '120px'}}>Usuario</th>
                      <th style={{...s.th, width: '100px'}}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialFiltrado.map((h, i) => {
                      const fecha = new Date(new Date(h.FechaHora).getTime() + (4 * 60 * 60 * 1000));
                      const fechaStr = fecha.toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Santo_Domingo' });
                      const horaStr = fecha.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Santo_Domingo' });
                      const formatearValor = (val) => {
                        if (!val) return '—';
                        const d = new Date(val);
                        if (!isNaN(d.getTime()) && val.includes('-') && val.length >= 10) return d.toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' });
                        return val;
                      };
                      return (
                        <tr key={h.Id} style={i % 2 === 0 ? s.trPar : s.trImpar}>
                          <td style={{...s.td, textAlign: 'center', width: '40px'}}>
                            <input type="checkbox" checked={historialSeleccionado.includes(h.Id)} onChange={() => toggleSeleccionRegistro(h.Id)} />
                          </td>
                          <td style={{...s.td, whiteSpace: 'normal', wordBreak: 'break-word'}}><div>{fechaStr}</div><div style={{ fontSize: '12px', color: '#888', marginTop: '3px' }}>{horaStr}</div></td>
                          <td style={{...s.td, whiteSpace: 'normal', wordBreak: 'break-word'}}><strong>{h.Campo}</strong></td>
                          <td style={{...s.td, whiteSpace: 'normal', wordBreak: 'break-word', color: '#e74c3c'}}>{formatearValor(h.ValorAnterior)}</td>
                          <td style={{...s.td, whiteSpace: 'normal', wordBreak: 'break-word', color: '#27ae60'}}>{formatearValor(h.ValorNuevo)}</td>
                          <td style={{...s.td, whiteSpace: 'normal', wordBreak: 'break-word'}}>Administrador</td>
                          <td style={{...s.td, display: 'flex', justifyContent: 'center'}}>
                            <button style={{ ...s.btnEliminar, padding: '4px 8px', fontSize: '11px' }} onClick={() => eliminarRegistroHistorial(h.Id)}>Eliminar</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </>
              )}
            </div>
            <div style={{...s.modalFooter, justifyContent: 'space-between', alignItems: 'center'}}>
              <select style={{ ...s.filtroInput, fontSize: '13px', padding: '8px 12px', borderRadius: '8px', minWidth: '220px' }} value={fechaFiltroHistorial} onChange={e => { setFechaFiltroHistorial(e.target.value); setHistorialSeleccionado([]); setSelectAllHistorial(false); }}>
                <option value="">Todos los historiales</option>
                {fechasHistorial.map(f => <option key={f} value={f}>{new Date(f).toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })}</option>)}
              </select>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button style={s.btnGuardar} onClick={async () => {
                  toast.loading('Generando reporte...', { id: 'historial-pdf' });
                  try {
                    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
                    if (!token) throw new Error('No token de sesión disponible');
                    const params = fechaFiltroHistorial ? `?fecha=${fechaFiltroHistorial}` : '';
                    const res = await fetch(`http://localhost:5000/api/historial/${empleadoHistorial.Id}/imprimir${params}`, { headers: { Authorization: `Bearer ${token}` } });
                    if (!res.ok) throw new Error();
                    const blob = await res.blob();
                    window.open(URL.createObjectURL(blob));
                    toast.success('Reporte generado', { id: 'historial-pdf' });
                  } catch { toast.error('Error al generar reporte', { id: 'historial-pdf' }); }
                }}>🖨️ Imprimir</button>
                <button style={s.btnCancelar} onClick={() => setModalHistorial(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL REPORTE ── */}
      {modalReporte && (
        <div style={s.overlay}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '36px 40px', width: '100%', maxWidth: '560px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div><h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1a2744' }}>Reporte General</h3><p style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>Selecciona los filtros para el reporte</p></div>
              <button style={s.btnCerrar} onClick={() => setModalReporte(false)}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={s.filtroGrupo}><label style={s.filtroLabel}>Estatus</label><select style={s.filtroInput} value={filtrosReporte.estatus} onChange={e => setFiltrosReporte({...filtrosReporte, estatus: e.target.value})}><option value="">Todos</option><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option><option value="Suspendido">Suspendido</option><option value="Vacaciones">Vacaciones</option></select></div>
              <div style={s.filtroGrupo}><label style={s.filtroLabel}>Cargo</label><input style={s.filtroInput} placeholder="Ej: Analista..." value={filtrosReporte.cargo} onChange={e => setFiltrosReporte({...filtrosReporte, cargo: e.target.value})} /></div>
              <div style={s.filtroGrupo}><label style={s.filtroLabel}>Itinerario</label><input style={s.filtroInput} placeholder="Ej: Diurno..." value={filtrosReporte.itinerario} onChange={e => setFiltrosReporte({...filtrosReporte, itinerario: e.target.value})} /></div>
              <div style={s.filtroGrupo}><label style={s.filtroLabel}>Grupo Ocupacional</label><input style={s.filtroInput} placeholder="Ej: Técnico..." value={filtrosReporte.grupoOcupacional} onChange={e => setFiltrosReporte({...filtrosReporte, grupoOcupacional: e.target.value})} /></div>
              <div style={s.filtroGrupo}><label style={s.filtroLabel}>AFP</label><input style={s.filtroInput} placeholder="Ej: AFP Popular..." value={filtrosReporte.AFP} onChange={e => setFiltrosReporte({...filtrosReporte, AFP: e.target.value})} /></div>
              <div style={s.filtroGrupo}><label style={s.filtroLabel}>ARS</label><input style={s.filtroInput} placeholder="Ej: ARS Humano..." value={filtrosReporte.ARS} onChange={e => setFiltrosReporte({...filtrosReporte, ARS: e.target.value})} /></div>
              <div style={s.filtroGrupo}><label style={s.filtroLabel}>Salario mínimo</label><input style={s.filtroInput} type="number" placeholder="0" value={filtrosReporte.salarioMin} onChange={e => setFiltrosReporte({...filtrosReporte, salarioMin: e.target.value})} /></div>
              <div style={s.filtroGrupo}><label style={s.filtroLabel}>Salario máximo</label><input style={s.filtroInput} type="number" placeholder="999999" value={filtrosReporte.salarioMax} onChange={e => setFiltrosReporte({...filtrosReporte, salarioMax: e.target.value})} /></div>
              <div style={{...s.filtroGrupo, gridColumn: '1 / -1'}}>
                <label style={s.filtroLabel}>Límite de registros</label>
                <select style={s.filtroInput} value={filtrosReporte.limite} onChange={e => setFiltrosReporte({...filtrosReporte, limite: e.target.value})}>
                  <option value="">Todos</option><option value="10">10 registros</option><option value="25">25 registros</option><option value="50">50 registros</option><option value="100">100 registros</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
              <button style={s.btnCancelar} onClick={() => { setModalReporte(false); setFiltrosReporte({ estatus: '', cargo: '', itinerario: '', AFP: '', ARS: '', grupoOcupacional: '', salarioMin: '', salarioMax: '', limite: '' }); }}>Cancelar</button>
              <button style={s.btnGuardar} onClick={generarReporte} disabled={generandoReporte}>{generandoReporte ? 'Generando...' : 'Generar PDF'}</button>
            </div>
          </div>
        </div>
      )}

      {modalConfirmarAnexo && (
        <div style={{...s.overlay, zIndex: 1100}}>
          <div style={s.modalEliminar}>
            <div style={s.modalEliminarIcono}>❗</div>
            <h3 style={{...s.modalEliminarTitulo, color: '#ef4444'}}>Eliminar anexo</h3>
            <p style={s.modalEliminarTexto}>¿Estás seguro de que deseas eliminar este anexo?</p>
            <div style={s.modalEliminarBtns}>
              <button style={s.btnCancelarEliminar} onClick={() => setModalConfirmarAnexo(null)}>Cancelar</button>
              <button style={s.btnConfirmarEliminar} onClick={() => {
                if (modalConfirmarAnexo?.tipo === 'editar') eliminarAnexo(modalConfirmarAnexo.id, modalConfirmarAnexo.empleadoId);
                else if (modalConfirmarAnexo?.tipo === 'ver') eliminarAnexoVer(modalConfirmarAnexo.id, modalConfirmarAnexo.empleadoId);
                else if (modalConfirmarAnexo) eliminarAnexo(modalConfirmarAnexo.id, modalConfirmarAnexo.empleadoId);
                setModalConfirmarAnexo(null);
              }}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}


  </div>
);
};

const Campo = ({ label, name, value, onChange, type = 'text', required = false, error = null, readOnly = false }) => (
  <div style={s.campoContenedor}>
    <label style={s.label}>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
    <input type={type} name={name} value={value} onChange={onChange} readOnly={readOnly}
      style={{ ...s.input, borderColor: error ? '#ef4444' : '#ddd', backgroundColor: readOnly ? '#f0f2f5' : error ? '#fff8f8' : 'white', cursor: readOnly ? 'not-allowed' : 'auto' }} />
    {error && <span style={s.errorMsg}>{error}</span>}
  </div>
);

const s = {
  pagina:     { minHeight: '100vh', width: '100%', backgroundColor: '#f0f2f5' },
  contenido:  { padding: '36px 40px', maxWidth: '1400px', margin: '0 auto' },
  encabezado: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  titulo:     { fontSize: '26px', fontWeight: '700', color: '#1a2744', marginBottom: '4px' },
  subtitulo:  { color: '#888', fontSize: '14px' },
  btnCrear:   { backgroundColor: '#1a2744', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
  barraFiltros: { display: 'flex', gap: '24px', marginBottom: '20px', alignItems: 'flex-start' },
  buscador:     { flex: 1, padding: '10px 18px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '8px', outline: 'none', backgroundColor: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  filtrosPills: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' },
  pillBtn:      { padding: '9px 16px', borderRadius: '99px', border: '1.5px solid #e2e8f0', backgroundColor: 'white', color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
  pillActivo:   { backgroundColor: '#1a2744', color: 'white', border: '1.5px solid #1a2744' },
  tablaContenedor: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflowX: 'auto' },
  tabla:  { width: '100%', borderCollapse: 'collapse' },
  th:     { backgroundColor: '#1a2744', color: 'white', padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' },
  td:     { padding: '13px 16px', fontSize: '14px', color: '#333', whiteSpace: 'nowrap' },
  trPar:  { backgroundColor: 'white' },
  trImpar:{ backgroundColor: '#f8f9fb' },
  badge:  { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  cargando: { textAlign: 'center', padding: '40px', color: '#888' },
  acciones:        { display: 'flex', gap: '8px' },
  btnVer:          { padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#eef1f8', color: '#1a2744', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnAnexos:       { padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#e0f2fe', color: '#0284c7', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnEditar:       { padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#fff8e1', color: '#f39c12', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnEliminar:     { padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#fdf2f2', color: '#e74c3c', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  selectConstancia:{ padding: '6px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#f0fdf4', color: '#15803d', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnHistorial:    { padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#f0f4ff', color: '#3b82f6', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  paginacion: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '24px' },
  btnPag:     { padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: 'white', color: '#1a2744', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  pagNumeros: { display: 'flex', gap: '4px', alignItems: 'center' },
  btnPagNum:  { width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: 'white', color: '#333', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  btnPagActivo:{ backgroundColor: '#1a2744', color: 'white', border: '1px solid #1a2744' },
  pagDots:    { color: '#888', fontSize: '14px', padding: '0 4px' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  modalGrande: { backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '1100px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' },
  modalEliminar: { backgroundColor: 'white', borderRadius: '16px', padding: '40px 48px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: '440px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderBottom: '1px solid #eee' },
  modalTitulo: { fontSize: '18px', fontWeight: '700', color: '#1a2744' },
  btnCerrar:   { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' },
  modalForm:   { overflowY: 'auto', flex: 1 },
  formGrid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px', padding: '24px 28px' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 28px', borderTop: '1px solid #eee' },
  seccion:        { gridColumn: '1 / -1', fontSize: '13px', fontWeight: '700', color: '#1a2744', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '2px solid #eef1f8', paddingBottom: '8px', marginTop: '8px' },
  campoContenedor:{ display: 'flex', flexDirection: 'column', gap: '6px' },
  label:          { fontSize: '13px', fontWeight: '600', color: '#555' },
  input:          { padding: '10px 12px', border: '1px solid #ddd', borderRadius: '7px', fontSize: '14px', outline: 'none', width: '100%' },
  errorMsg:       { fontSize: '12px', color: '#ef4444', fontWeight: '500', marginTop: '2px' },
  btnCancelar: { padding: '10px 24px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: 'white', color: '#555', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  btnGuardar:  { padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#1a2744', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  verFila:  { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f5f5f5' },
  verLabel: { color: '#888', fontSize: '14px', fontWeight: '500' },
  verValor: { color: '#1a2744', fontSize: '14px', fontWeight: '600', textAlign: 'right' },
  modalEliminarIcono:  { display: 'flex', justifyContent: 'center', marginBottom: '20px' },
  modalEliminarTitulo: { fontSize: '20px', fontWeight: '800', color: '#1a2744', textAlign: 'center', marginBottom: '12px' },
  modalEliminarTexto:  { fontSize: '14px', color: '#64748b', textAlign: 'center', lineHeight: 1.7, marginBottom: '32px' },
  modalEliminarBtns:   { display: 'flex', gap: '12px', justifyContent: 'center' },
  btnCancelarEliminar: { padding: '11px 32px', borderRadius: '8px', border: '1.5px solid #ddd', backgroundColor: 'white', color: '#333', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  btnConfirmarEliminar:{ padding: '11px 32px', borderRadius: '8px', border: 'none', backgroundColor: '#ef4444', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  filtrosPanel: { backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #e2e8f0' },
  filtrosGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' },
  filtroGrupo:  { display: 'flex', flexDirection: 'column', gap: '6px' },
  filtroLabel:  { fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' },
  filtroInput:  { padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', backgroundColor: '#fafbfc' },
  btnReporte:   { backgroundColor: 'white', color: '#1a2744', border: '1.5px solid #1a2744', padding: '12px 24px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
  btnSubirAnexo:    { padding: '10px 28px', borderRadius: '8px', border: '2px dashed #1a2744', backgroundColor: 'white', color: '#1a2744', fontSize: '14px', fontWeight: '600', cursor: 'pointer', textAlign: 'center' },
  anexoFila:        { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', backgroundColor: '#f8f9fb', borderRadius: '8px', border: '1px solid #e2e8f0' },
  anexoIcono:       { fontSize: '20px' },
  btnVerAnexo:      { padding: '5px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#1a2744', color: 'white', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  anexoCard:        { backgroundColor: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  anexoThumb:       { height: '140px', backgroundColor: '#f8f9fb', cursor: 'pointer', overflow: 'hidden', borderRadius: '6px 6px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  anexoCardInfo:    { padding: '10px 12px', flex: 1 },
  anexoCardBtns:    { display: 'flex', gap: '6px', padding: '8px 12px', borderTop: '1px solid #eee', backgroundColor: '#fafbfc' },
  btnImprimirAnexo: { padding: '5px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#eff6ff', color: '#3b82f6', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  btnEliminarAnexo: { padding: '5px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#fdf2f2', color: '#e74c3c', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
};

export default Empleados;
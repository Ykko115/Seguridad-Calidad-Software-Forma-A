export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getStatusColor(fechaFin) {
  if (!fechaFin) return 'default';
  const fin = new Date(fechaFin);
  const hoy = new Date();
  const diasRestantes = Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24));

  if (diasRestantes < 0) return 'error';
  if (diasRestantes <= 7) return 'warning';
  if (diasRestantes <= 30) return 'info';
  return 'success';
}

export function getStatusLabel(fechaFin) {
  if (!fechaFin) return 'Sin fecha';
  const fin = new Date(fechaFin);
  const hoy = new Date();
  const diasRestantes = Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24));

  if (diasRestantes < 0) return `Vencido (${Math.abs(diasRestantes)} días)`;
  if (diasRestantes === 0) return 'Vence hoy';
  if (diasRestantes <= 7) return `Vence en ${diasRestantes} días`;
  if (diasRestantes <= 30) return `Vence en ${diasRestantes} días`;
  return 'Vigente';
}

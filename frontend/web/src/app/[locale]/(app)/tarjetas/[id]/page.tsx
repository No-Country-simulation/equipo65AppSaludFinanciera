'use client';

import { useParams } from 'next/navigation';
import { FormularioTarjeta } from '@/components/FormularioTarjeta';

export default function PaginaEditarTarjeta() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return <FormularioTarjeta tarjetaId={id} />;
}

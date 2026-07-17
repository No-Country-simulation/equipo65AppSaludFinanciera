import { Pressable, Text, View } from 'react-native';
import type { Idioma } from '@/data';
import { Colores, Fuentes } from '@/constants/tema';
import { IDIOMAS_DISPONIBLES, useI18n } from '@/i18n';

/** Chips ES · PT · EN. `claro` para usarlo sobre fondos de tinta. */
export function SelectorIdioma({ claro = false }: { claro?: boolean }) {
  const { idioma, setIdioma } = useI18n();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {IDIOMAS_DISPONIBLES.map((codigo: Idioma) => {
        const activo = codigo === idioma;
        return (
          <Pressable
            key={codigo}
            onPress={() => setIdioma(codigo)}
            style={{
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 4,
              backgroundColor: activo
                ? claro
                  ? 'rgba(255,255,255,0.22)'
                  : Colores.acento
                : 'transparent',
              borderWidth: 1,
              borderColor: activo
                ? 'transparent'
                : claro
                  ? 'rgba(255,255,255,0.35)'
                  : Colores.linea,
            }}
          >
            <Text
              style={{
                fontFamily: Fuentes.cuerpoSemi,
                fontSize: 11,
                color: activo || claro ? Colores.blanco : Colores.apagado,
              }}
            >
              {codigo.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

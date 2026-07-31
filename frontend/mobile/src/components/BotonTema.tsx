import { Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colores } from '@/constants/tema';
import { useTheme } from '@/context/ThemeContext';
import { useI18n } from '@/i18n';

/** Alterna claro/oscuro. `claro` = variante para fondos de tinta (hero, login). */
export function BotonTema({ claro = false }: { claro?: boolean }) {
  const { esModoOscuro, toggleTema, temaActivo } = useTheme();
  const { t } = useI18n();

  return (
    <Pressable
      onPress={toggleTema}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={t('comun.cambiarTema')}
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor: claro ? 'rgba(255,255,255,0.35)' : temaActivo.linea,
        paddingHorizontal: 9,
        paddingVertical: 6,
      }}
    >
      <Ionicons
        name={esModoOscuro ? 'sunny-outline' : 'moon-outline'}
        size={15}
        color={claro ? Colores.blanco : temaActivo.tinta}
      />
    </Pressable>
  );
}

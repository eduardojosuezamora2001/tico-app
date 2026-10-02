/**
 * Pesos del ranking cuando el motor externo toma el relevo de la MV.
 * Distancia y texto salen de Postgres; patrocinio queda en 0 hasta que exista la señal.
 */
export const DISCOVERY_RANKING_WEIGHTS = {
  distance: 0.45,
  textRank: 0.35,
  sponsorship: 0.2,
} as const

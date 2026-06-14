// Compatibilidad: re-exporta desde el registro multi-campaña.
// ALL_ROLES / ROLE_BY_ID ahora incluyen TODAS las campañas.
export {
  ALL_ROLES,
  ROLE_BY_ID,
  ROLE_NAMES,
  ROLE_TYPES,
  CAMPAIGNS,
  CAMPAIGN_LIST,
  DEFAULT_CAMPAIGN,
  getCampaign,
  campaignRoles,
  statusTokens,
  remindersForRolesInPlay,
} from './campaigns';

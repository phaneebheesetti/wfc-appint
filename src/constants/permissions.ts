// ! Ignore these enums for now, they are not used anymore
// ! and it's too much work to remove them from the database because of migrations conflicts with enums
export enum CampaignsParticipantsPermissionsEnum {
  ALL = "campaigns_participants.all",
  SELECT = "campaigns_participants.select",
  INSERT = "campaigns_participants.insert",
  UPDATE = "campaigns_participants.update",
  DELETE = "campaigns_participants.delete",
}

export enum ParticipantsPermissionsEnum {
  ALL = "participants.all",
  SELECT = "participants.select",
  INSERT = "participants.insert",
  UPDATE = "participants.update",
  DELETE = "participants.delete",
}
// ! End of ignore

export enum CampaignsUsersPermissionsEnum {
  ALL = "campaigns_users.all",
  SELECT = "campaigns_users.select",
  INSERT = "campaigns_users.insert",
  UPDATE = "campaigns_users.update",
  DELETE = "campaigns_users.delete",
}

export enum CampaignsPermissionsEnum {
  ALL = "campaigns.all",
  SELECT = "campaigns.select",
  INSERT = "campaigns.insert",
  UPDATE = "campaigns.update",
  DELETE = "campaigns.delete",
}

export enum ContactInfosPermissionsEnum {
  ALL = "contact_infos.all",
  SELECT = "contact_infos.select",
  INSERT = "contact_infos.insert",
  UPDATE = "contact_infos.update",
  DELETE = "contact_infos.delete",
}

export enum OrganizationsPermissionsEnum {
  ALL = "organizations.all",
  SELECT = "organizations.select",
  INSERT = "organizations.insert",
  UPDATE = "organizations.update",
  DELETE = "organizations.delete",
}

export enum RolePermissionsEnum {
  ALL = "role_permissions.all",
  SELECT = "role_permissions.select",
  INSERT = "role_permissions.insert",
  UPDATE = "role_permissions.update",
  DELETE = "role_permissions.delete",
}

export enum UserPermissionsEnum {
  ALL = "users.all",
  SELECT = "users.select",
  INSERT = "users.insert",
  UPDATE = "users.update",
  DELETE = "users.delete",
}

export enum OrganizationsUsersPermissionsEnum {
  ALL = "organizations_users.all",
  SELECT = "organizations_users.select",
  INSERT = "organizations_users.insert",
  UPDATE = "organizations_users.update",
  DELETE = "organizations_users.delete",
}

export enum CasesTransactionsPermissionsEnum {
  ALL = "cases_transactions.all",
  SELECT = "cases_transactions.select",
  INSERT = "cases_transactions.insert",
  UPDATE = "cases_transactions.update",
  DELETE = "cases_transactions.delete",
}

export enum PaymentLogsPermissionsEnum {
  ALL = "payment_logs.all",
  SELECT = "payment_logs.select",
  INSERT = "payment_logs.insert",
  UPDATE = "payment_logs.update",
  DELETE = "payment_logs.delete",
}

export enum PrizesPermissionsEnum {
  ALL = "prizes.all",
  SELECT = "prizes.select",
  INSERT = "prizes.insert",
  UPDATE = "prizes.update",
  DELETE = "prizes.delete",
}

export enum EventsPermissionsEnum {
  ALL = "events.all",
  SELECT = "events.select",
  INSERT = "events.insert",
  UPDATE = "events.update",
  DELETE = "events.delete",
}

export enum DocumentsPermissionsEnum {
  ALL = "documents.all",
  SELECT = "documents.select",
  INSERT = "documents.insert",
  UPDATE = "documents.update",
  DELETE = "documents.delete",
}

export enum DocumentsUsersPermissionsEnum {
  ALL = "documents_users.all",
  SELECT = "documents_users.select",
  INSERT = "documents_users.insert",
  UPDATE = "documents_users.update",
  DELETE = "documents_users.delete",
}

export enum ChannelsPermissionsEnum {
  ALL = "channels.all",
  SELECT = "channels.select",
  INSERT = "channels.insert",
  UPDATE = "channels.update",
  DELETE = "channels.delete",
}

export enum ChannelMessagesPermissionsEnum {
  ALL = "channel_messages.all",
  SELECT = "channel_messages.select",
  INSERT = "channel_messages.insert",
  UPDATE = "channel_messages.update",
  DELETE = "channel_messages.delete",
}

export enum ChannelsUsersPermissionsEnum {
  ALL = "channels_users.all",
  SELECT = "channels_users.select",
  INSERT = "channels_users.insert",
  UPDATE = "channels_users.update",
  DELETE = "channels_users.delete",
}

export enum CampaignAnnouncementsPermissionsEnum {
  ALL = "campaign_announcements.all",
  SELECT = "campaign_announcements.select",
  INSERT = "campaign_announcements.insert",
  UPDATE = "campaign_announcements.update",
  DELETE = "campaign_announcements.delete",
}

export enum ParticipantParentMappingPermissionsEnum {
  ALL = "participant_parent_mapping.all",
  SELECT = "participant_parent_mapping.select",
  INSERT = "participant_parent_mapping.insert",
  DELETE = "participant_parent_mapping.delete",
}

export enum RoleSwitchHistoryPermissionsEnum {
  ALL = "role_switch_history.all",
  SELECT = "role_switch_history.select",
  INSERT = "role_switch_history.insert",
}

export enum CampaignsProgressPermissionsEnum {
  ALL = "campaigns_progress.all",
  SELECT = "campaigns_progress.select",
  INSERT = "campaigns_progress.insert",
  UPDATE = "campaigns_progress.update",
  DELETE = "campaigns_progress.delete",
}

export enum ParticipantNamesAccessPermissionsEnum {
  ALL = "participant_names_access.all",
  SELECT = "participant_names_access.select",
  INSERT = "participant_names_access.insert",
  UPDATE = "participant_names_access.update",
  DELETE = "participant_names_access.delete",
}

export enum ParticipantNamesAccessLogsPermissionsEnum {
  ALL = "participant_names_access_logs.all",
  SELECT = "participant_names_access_logs.select",
  INSERT = "participant_names_access_logs.insert",
}

export enum DigitalSalesInformationPermissionsEnum {
  ALL = "digital_sales_information.all",
  SELECT = "digital_sales_information.select",
  INSERT = "digital_sales_information.insert",
  UPDATE = "digital_sales_information.update",
  DELETE = "digital_sales_information.delete",
}

export enum ConsumersPermissionsEnum {
  ALL = "consumers.all",
  SELECT = "consumers.select",
  INSERT = "consumers.insert",
  UPDATE = "consumers.update",
  DELETE = "consumers.delete",
}

export enum ConsumerPaymentLogsPermissionsEnum {
  ALL = "consumer_payment_logs.all",
  SELECT = "consumer_payment_logs.select",
  INSERT = "consumer_payment_logs.insert",
  UPDATE = "consumer_payment_logs.update",
  DELETE = "consumer_payment_logs.delete",
}

export type Permission =
  | CampaignsParticipantsPermissionsEnum
  | CampaignsUsersPermissionsEnum
  | CampaignsPermissionsEnum
  | ContactInfosPermissionsEnum
  | OrganizationsPermissionsEnum
  | OrganizationsUsersPermissionsEnum
  | ParticipantsPermissionsEnum
  | RolePermissionsEnum
  | UserPermissionsEnum
  | CasesTransactionsPermissionsEnum
  | PaymentLogsPermissionsEnum
  | PrizesPermissionsEnum
  | EventsPermissionsEnum
  | DocumentsPermissionsEnum
  | DocumentsUsersPermissionsEnum
  | ChannelsPermissionsEnum
  | ChannelMessagesPermissionsEnum
  | ChannelsUsersPermissionsEnum
  | CampaignAnnouncementsPermissionsEnum
  | ParticipantParentMappingPermissionsEnum
  | RoleSwitchHistoryPermissionsEnum
  | CampaignsProgressPermissionsEnum
  | ParticipantNamesAccessPermissionsEnum
  | ParticipantNamesAccessLogsPermissionsEnum
  | DigitalSalesInformationPermissionsEnum
  | ConsumersPermissionsEnum
  | ConsumerPaymentLogsPermissionsEnum

const permissionsEnumToMap = <T extends string>(enumObj: Record<string, string>) => {
  return Object.values(enumObj).reduce(
    (acc, permission) => {
      acc[permission as T] = true
      return acc
    },
    {} as Record<T, boolean>
  )
}

// ! This is a hacky way for typescript to require all permissions to be included in the map
// ! otherwise it will throw an error if we forget to add a new permission
const allPermissionsMap: Record<Permission, boolean> = {
  ...permissionsEnumToMap<OrganizationsUsersPermissionsEnum>(OrganizationsUsersPermissionsEnum),
  ...permissionsEnumToMap<CampaignsParticipantsPermissionsEnum>(CampaignsParticipantsPermissionsEnum),
  ...permissionsEnumToMap<CampaignsUsersPermissionsEnum>(CampaignsUsersPermissionsEnum),
  ...permissionsEnumToMap<CampaignsPermissionsEnum>(CampaignsPermissionsEnum),
  ...permissionsEnumToMap<ContactInfosPermissionsEnum>(ContactInfosPermissionsEnum),
  ...permissionsEnumToMap<OrganizationsPermissionsEnum>(OrganizationsPermissionsEnum),
  ...permissionsEnumToMap<ParticipantsPermissionsEnum>(ParticipantsPermissionsEnum),
  ...permissionsEnumToMap<RolePermissionsEnum>(RolePermissionsEnum),
  ...permissionsEnumToMap<UserPermissionsEnum>(UserPermissionsEnum),
  ...permissionsEnumToMap<CasesTransactionsPermissionsEnum>(CasesTransactionsPermissionsEnum),
  ...permissionsEnumToMap<PaymentLogsPermissionsEnum>(PaymentLogsPermissionsEnum),
  ...permissionsEnumToMap<PrizesPermissionsEnum>(PrizesPermissionsEnum),
  ...permissionsEnumToMap<EventsPermissionsEnum>(EventsPermissionsEnum),
  ...permissionsEnumToMap<DocumentsPermissionsEnum>(DocumentsPermissionsEnum),
  ...permissionsEnumToMap<DocumentsUsersPermissionsEnum>(DocumentsUsersPermissionsEnum),
  ...permissionsEnumToMap<ChannelsPermissionsEnum>(ChannelsPermissionsEnum),
  ...permissionsEnumToMap<ChannelMessagesPermissionsEnum>(ChannelMessagesPermissionsEnum),
  ...permissionsEnumToMap<ChannelsUsersPermissionsEnum>(ChannelsUsersPermissionsEnum),
  ...permissionsEnumToMap<CampaignAnnouncementsPermissionsEnum>(CampaignAnnouncementsPermissionsEnum),
  ...permissionsEnumToMap<ParticipantParentMappingPermissionsEnum>(ParticipantParentMappingPermissionsEnum),
  ...permissionsEnumToMap<RoleSwitchHistoryPermissionsEnum>(RoleSwitchHistoryPermissionsEnum),
  ...permissionsEnumToMap<CampaignsProgressPermissionsEnum>(CampaignsProgressPermissionsEnum),
  ...permissionsEnumToMap<ParticipantNamesAccessPermissionsEnum>(ParticipantNamesAccessPermissionsEnum),
  ...permissionsEnumToMap<ParticipantNamesAccessLogsPermissionsEnum>(ParticipantNamesAccessLogsPermissionsEnum),
  ...permissionsEnumToMap<DigitalSalesInformationPermissionsEnum>(DigitalSalesInformationPermissionsEnum),
  ...permissionsEnumToMap<ConsumersPermissionsEnum>(ConsumersPermissionsEnum),
  ...permissionsEnumToMap<ConsumerPaymentLogsPermissionsEnum>(ConsumerPaymentLogsPermissionsEnum),
}

export const allPermissions = Object.keys(allPermissionsMap)

// This file should be renamed to GuildEventConfig.
// This file handles what happens on each guild.
// It includes settings for where to log, and what to log.
// All events are displayed in Bot.ts.
const GuildEventConfig = [
    {
        id: '123',
        logChannelId: '1234',
        events: [
            'guildChannelPermissionsChanged',
            'guildMemberBoost',
            'guildMemberUnboost',
            'guildMemberRoleAdd',
            'guildMemberRoleRemove',
            'guildMemberNicknameUpdate',
            'guildBoostLevelUp',
            'guildBoostLevelDown',
            'guildRegionUpdate',
            'guildBannerAdd',
            'guildAfkChannelAdd',
            'guildVanityURLAdd',
            'messagePinned',
            'messageContentEdited',
            'userAvatarUpdate',
            'userUsernameUpdate',
            'voiceChannelJoin',
            'voiceChannelLeave',
            'voiceChannelSwitch',
            'voiceChannelMute',
            'voiceChannelDeaf',
            'voiceChannelUnmute',
            'voiceChannelUndeaf',
            'voiceStreamingStart',
            'voiceStreamingStop',
            'guildMemberAdd',
            'guildMemberRemove',
            'messageDelete',
            'messageDeleteBulk',
        ]
    },
    {
        id: '1234',
        logChannelId: '12345',
        events: [
            'guildChannelPermissionsChanged',
            'guildMemberBoost',
            'guildMemberUnboost',
            'guildMemberRoleAdd',
            'guildMemberRoleRemove',
            'guildMemberNicknameUpdate',
            'guildBoostLevelUp',
            'guildBoostLevelDown',
            'guildRegionUpdate',
            'guildBannerAdd',
            'guildAfkChannelAdd',
            'guildVanityURLAdd',
            'messagePinned',
            'messageContentEdited',
            'userAvatarUpdate',
            'userUsernameUpdate',
            'voiceChannelJoin',
            'voiceChannelLeave',
            'voiceChannelSwitch',
            'voiceChannelMute',
            'voiceChannelDeaf',
            'voiceChannelUnmute',
            'voiceChannelUndeaf',
            'voiceStreamingStart',
            'voiceStreamingStop',
            'guildMemberAdd',
            'guildMemberRemove',
            'messageDelete',
            'messageDeleteBulk',
        ]
    }
]

export = GuildEventConfig;

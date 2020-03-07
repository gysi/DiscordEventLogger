import {
    Client,
    GuildChannel,
    Role,
    User,
    Message,
    GuildMember,
    Permissions,
    Guild,
    Status,
    Presence,
    VoiceChannel,
    VoiceState,
    TextChannel,
} from 'discord.js';
import logs from 'discord-logs';
import Config from '../Config';
import GuildEventConfig from '../GuildEventConfig';

const client = new Client();
logs(client);

class Bot {

    constructor() {
        this.logMessage = this.logMessage.bind(this);
        this.logMessageToMultiple = this.logMessageToMultiple.bind(this);
        this.findGuildsForUser = this.findGuildsForUser.bind(this);
        this.safe = this.safe.bind(this);
    }

    private safe(str: string) {
        return str.replace(/`/g, '');
    }

    private logMessage(event: string, message: string, guild: Guild) {
        const guildConfig = GuildEventConfig.find(config => config.id === guild.id);
        if (!!guildConfig && guildConfig.events.includes(event)) {
            const channel: TextChannel = < TextChannel > guild.channels.cache.find(channel => channel.id === guildConfig.logChannelId);
            if (!!channel) {
                channel.send(message);
            }
        }
    }

    private logMessageToMultiple(event: string, message: string, guilds: Guild[]) {
        for (const guild of guilds) {
            this.logMessage(event, message, guild);
        }
    }

    private findGuildsForUser(user: User) : Promise<Guild[]> {
        return new Promise((resolve, reject) => {
            let matchedGuilds = [];
            const guilds = client.guilds.cache;
            const promises = [];
    
            for (const guild of guilds) {
                promises.push(guild[1].members.fetch(user.id))
            }
            
            Promise.all(promises).then(values => {
                for (const val of values) {
                    if (!!val) {
                        matchedGuilds.push(val.guild);
                    }
                } 
                resolve(matchedGuilds);
            }).catch(reject);
        });
    }

    public start() {
        client.on("guildChannelPermissionsChanged", (channel: GuildChannel, oldPermissions: Permissions, newPermissions: Permissions) => {
            this.logMessage('guildChannelPermissionsChanged', channel.name + "'s permissions changed!", channel.guild);
        });

        client.on("unhandledGuildChannelUpdate", (oldChannel: GuildChannel, newChannel: GuildChannel) => {
            this.logMessage('unhandledGuildChannelUpdate', "Channel '" + oldChannel.id + "' was edited but discord-logs couldn't find what was updated...", oldChannel.guild);
        });

        client.on("guildMemberBoost", (member: GuildMember) => {
            this.logMessage('guildMemberBoost', `<@${member.user.id}> (${member.user.tag}) has started boosting ${member.guild.name}`, member.guild);
        });

        client.on("guildMemberUnboost", (member: GuildMember) => {
            this.logMessage('guildMemberUnboost', `<@${member.user.id}> (${member.user.tag}) has stopped boosting ${member.guild.name}...`, member.guild);
        });

        client.on("guildMemberRoleAdd", (member: GuildMember, role: Role) => {
            this.logMessage('guildMemberRoleAdd', `<@${member.user.id}> (${member.user.tag}) acquired the role: ${role.name}`, member.guild);
        });

        client.on("guildMemberRoleRemove", (member: GuildMember, role: Role) => {
            this.logMessage('guildMemberRoleRemove', `<@${member.user.id}> (${member.user.tag}) lost the role: ${role.name}`, member.guild);
        });

        client.on("guildMemberNicknameUpdate", (member: GuildMember, oldNickname: string, newNickname: string) => {
            this.logMessage('guildMemberNicknameUpdate', `<@${member.user.id}> (${member.user.tag})'s nickname was ${oldNickname} and is now ${newNickname}`, member.guild);
        });

        client.on("unhandledGuildMemberUpdate", (oldMember: GuildMember, newMember: GuildMember) => {
            this.logMessage('unhandledGuildMemberUpdate', `<@${oldMember.user.id}> (${oldMember.user.tag}) was edited but the update was not known`, oldMember.guild);
        });

        client.on("guildBoostLevelUp", (guild: Guild, oldLevel: number, newLevel: number) => {
            this.logMessage('guildBoostLevelUp', guild.name + " reaches the boost level: " + newLevel, guild);
        });

        client.on("guildBoostLevelDown", (guild: Guild, oldLevel: number, newLevel: number) => {
            this.logMessage('guildBoostLevelDown', guild.name + " returned to the boost level: " + newLevel, guild);
        });

        client.on("guildRegionUpdate", (guild: Guild, oldRegion: string, newRegion: string) => {
            this.logMessage('guildRegionUpdate', guild.name + " region is now " + newRegion, guild);
        });

        client.on("guildBannerAdd", (guild: Guild, bannerURL: string) => {
            this.logMessage('guildBannerAdd', guild.name + " has a banner now!", guild);
        });

        client.on("guildAfkChannelAdd", (guild: Guild, afkChannel: GuildChannel) => {
            this.logMessage('guildAfkChannelAdd', guild.name + " has an AFK channel now!", guild);
        });

        client.on("guildVanityURLAdd", (guild: Guild, vanityURL: string) => {
            this.logMessage('guildVanityURLAdd', guild.name + " has added a vanity url : " + vanityURL, guild);
        });

        client.on("unhandledGuildUpdate", (oldGuild: Guild, newGuild: Guild) => {
            this.logMessage('unhandledGuildUpdate', "Guild '" + oldGuild.name + "' was edited but the changes were not known", oldGuild);
        });

        client.on("messagePinned", (message: Message) => {
            const channelName = ( < any > message.channel).name;
            this.logMessage('messagePinned', `Message https://discordapp.com/channels/${message.guild.id}/${message.channel.id}/${message.id} has been pinned to ${channelName}: \`\`\`${this.safe(message.cleanContent)}\`\`\``, message.guild);
        });

        client.on("messageContentEdited", (message: Message, oldContent: string, newContent: string) => {
            this.logMessage('messageContentEdited', `Message https://discordapp.com/channels/${message.guild.id}/${message.channel.id}/${message.id} has been edited from \`\`\`${this.safe(oldContent)}\`\`\` to \`\`\`${this.safe(newContent)}\`\`\``, message.guild);
        });

        client.on("unhandledMessageUpdate", (oldMessage: Message, newMessage: Message) => {
            this.logMessage('unhandledMessageUpdate', `Message https://discordapp.com/channels/${oldMessage.guild.id}/${oldMessage.channel.id}/${oldMessage.id} was updated but the changes were not known` , oldMessage.guild);
        });

        client.on("guildMemberOffline", (member: GuildMember, oldStatus: Status) => {
            this.logMessage('guildMemberOffline', `<@${member.user.id}> (${member.user.tag}) became offline`, member.guild);
        });

        client.on("guildMemberOnline", (member: GuildMember, newStatus: Status) => {
            this.logMessage('guildMemberOnline', `<@${member.user.id}> (${member.user.tag}) was offline and is now ${newStatus}`, member.guild);
        });

        client.on("unhandledPresenceUpdate", (oldPresence: Presence, newPresence: Presence) => {
            this.logMessage('unhandledPresenceUpdate', `Presence for member <@${oldPresence.user.id}> (${oldPresence.user.tag}) was updated but the changes were not known`, oldPresence.guild);
        });

        client.on("rolePositionUpdate", (role: Role, oldPosition: number, newPosition: number) => {
            this.logMessage('rolePositionUpdate', role.name + " was at position " + oldPosition + " and now is at position " + newPosition, role.guild);
        });

        client.on("unhandledRoleUpdate", (oldRole: Role, newRole: Role) => {
            this.logMessage('unhandledRoleUpdate', "Role '" + oldRole.name + "' was updated but the changes were not nknown", oldRole.guild);
        });

        client.on("userAvatarUpdate", (user: User, oldAvatarURL: string, newAvatarURL: string) => {
            this.findGuildsForUser(user).then(guilds => {
                this.logMessageToMultiple('userAvatarUpdate', `<@${user.id}> (${user.tag}) avatar changed from ${oldAvatarURL} to ${newAvatarURL}`, guilds);
            })
        });

        client.on("userUsernameUpdate", (user: User, oldUsername: string, newUsername: string) => {
            this.findGuildsForUser(user).then(guilds => {
                this.logMessageToMultiple('userUsernameUpdate', `<@${user.id}> (${user.tag}) username changed from '${oldUsername}' to '${newUsername}'`, guilds);
            });
        });

        client.on("unhandledUserUpdate", (oldUser: User, newUser: User) => {
            this.findGuildsForUser(newUser).then(guilds => {
                this.logMessageToMultiple('unhandledUserUpdate', `User <@${newUser.id}> (${newUser.tag}) was updated but the changes were not known`, guilds);
            });
        });

        client.on("voiceChannelJoin", (member: GuildMember, channel: VoiceChannel) => {
            this.logMessage('voiceChannelJoin', `<@${member.user.id}> (${member.user.tag}) joined voice channel '${channel.name}'`, member.guild);
        });

        client.on("voiceChannelLeave", (member: GuildMember, channel: VoiceChannel) => {
            this.logMessage('voiceChannelLeave', `<@${member.user.id}> (${member.user.tag}) left voice channel '${channel.name}'`, member.guild);
        });

        client.on("voiceChannelSwitch", (member: GuildMember, oldChannel: VoiceChannel, newChannel: VoiceChannel) => {
            this.logMessage('voiceChannelSwitch', `<@${member.user.id}> (${member.user.tag}) left voice channel '${oldChannel.name}' and joined voice channel '${newChannel.name}'`, member.guild);
        });

        client.on("voiceChannelMute", (member: GuildMember, muteType: string) => {
            this.logMessage('voiceChannelMute', `<@${member.user.id}> (${member.user.tag}) is now ${muteType}`, member.guild);
        });

        client.on("voiceChannelDeaf", (member: GuildMember, deafType: string) => {
            this.logMessage('voiceChannelDeaf', `<@${member.user.id}> (${member.user.tag}) is now ${deafType}`, member.guild);
        });

        client.on("voiceChannelUnmute", (member: GuildMember, muteType: string) => {
            this.logMessage('voiceChannelUnmute', `<@${member.user.id}> (${member.user.tag}) is now unmuted`, member.guild);
        });

        client.on("voiceChannelUndeaf", (member: GuildMember, deafType: string) => {
            this.logMessage('voiceChannelUndeaf', `<@${member.user.id}> (${member.user.tag}) is now undeafened`, member.guild);
        });

        client.on("voiceStreamingStart", (member: GuildMember, voiceChannel: VoiceChannel) => {
            this.logMessage('voiceStreamingStart',`<@${member.user.id}> (${member.user.tag}) started streaming in ${voiceChannel.name}`, member.guild);
        });

        client.on("voiceStreamingStop", (member: GuildMember, voiceChannel: VoiceChannel) => {
            this.logMessage('voiceStreamingStop', `<@${member.user.id}> (${member.user.tag}) stopped streaming`, member.guild);
        });

        client.on("unhandledVoiceStateUpdate", (oldState: VoiceState, newState: VoiceState) => {
             this.logMessage('unhandledVoiceUpdate', `Voice state for member <@${oldState.member.user.id}> (${oldState.member.user.tag}) was updated but the changes were not known`, oldState.guild);
        });

        client.on("guildMemberAdd", (member) => {
            this.logMessage('guildMemberAdd', `<@${member.user.id}> (${member.user.tag}) has joined`, member.guild);
        });

        client.on("guildMemberRemove", (member) => {
            this.logMessage('guildMemberRemove', `<@${member.user.id}> (${member.user.tag}) has joined`, member.guild);
        });

        client.on("messageDelete", (message) => {
            const hasAttachment = message.attachments.size > 0;
            let attachmentUrl = '';
            if (hasAttachment) {
                attachmentUrl = message.attachments.first().proxyURL;
            }
            const channelName = ( < any > message.channel).name;
            this.logMessage('messageDelete', `<@${message.author.id}> (${message.author.tag})'s message \`\`\`${this.safe(message.cleanContent)}\`\`\` ${(hasAttachment ? ' with attachment ' + attachmentUrl : '')} from ${channelName} was deleted`, message.guild);
        });

        client.on("messageDeleteBulk", (messages) => {
            this.logMessage('messageDeleteBulk', `${messages.keys.length} messages were deleted.`, messages.first().guild);
        });

        client.on('ready', () => {
            console.log(`Logged in as ${client.user.tag}!`);
        });

        client.login(Config.BotToken);
    }
}

export = new Bot();
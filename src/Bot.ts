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
    Constants,
} from 'discord.js';
import logs from 'discord-logs';
import Config from '../Config';
import EventActioner, { InterpreterOptions } from './EventAction';
import { ConfigDatabase, GuildEventAction } from './ConfigDatabase';
import { ObjectId } from 'mongodb';

const client = new Client({ partials: Object.values(Constants.PartialTypes)  });
const commands = ['events', 'listevents', 'addevents', 'removeevents', 'deleteevents', 
'addeventaction', 'removeeventaction', 'listeventactions', 'eventactions'];

logs(client);

class Bot {

    constructor() {
        this.logMessage = this.logMessage.bind(this);
        this.logMessageToMultiple = this.logMessageToMultiple.bind(this);
        this.findGuildsForUser = this.findGuildsForUser.bind(this);
        this.findMembersForUser = this.findMembersForUser.bind(this);
        this.safe = this.safe.bind(this);
        this.executeCustomActions = this.executeCustomActions.bind(this);
        this.executeMultipleCustomActions = this.executeMultipleCustomActions.bind(this);
    }

    private safe(str: string) {
        return str.replace(/`/g, '');
    }

    private logMessage(event: string, message: string, guild: Guild) {
        ConfigDatabase.getGuildEvents(guild).then(events => {
            if (events.includes(event)) {
                ConfigDatabase.getOrAddGuild(guild).then(guildConfig => {
                    if (!!guildConfig) {
                        const channel: TextChannel = <TextChannel> guild.channels.cache.find(channel => channel.id === guildConfig.logChannelId);
                        if (!!channel) {
                            channel.send(message);
                        }
                    }
                });
            }
        });
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

    private findMembersForUser(user: any, guilds: Guild[]) {
        return new Promise((resolve, reject) => {
            let matchedMembers = [];
            const promises = [];
    
            guilds.forEach(guild => {
                promises.push(guild.members.fetch(user.id))
            });
            
            Promise.all(promises).then(values => {
                values.forEach(val => {
                    if (val !== undefined) {
                        matchedMembers.push(val);
                    }
                });
                resolve(matchedMembers);
            }).catch(reject);
        });
    }

    private executeCustomActions(event: string, options: InterpreterOptions) {
        // Simply lookup the database and send actions.
        ConfigDatabase.getGuildEventActionsForEvent(options.guild, event).then(actions => {
            actions.forEach(act => {
                EventActioner.interpretJs(act.actionCode, options)
            });
        });
    }

    private executeMultipleCustomActions(event: string, guilds: Guild[], options: InterpreterOptions) {
        for (const guild of guilds) {
            const opt: InterpreterOptions = {
                guild: guild,
                ...options
            };
            this.executeCustomActions(event, opt);
        }
    }
    
    public start() {

        client.on("guildChannelPermissionsChanged", (channel: GuildChannel, oldPermissions: Permissions, newPermissions: Permissions) => {
            this.logMessage('guildChannelPermissionsChanged', channel.name + "'s permissions changed!", channel.guild);
        });

        client.on("unhandledGuildChannelUpdate", (oldChannel: GuildChannel, newChannel: GuildChannel) => {
            this.logMessage('unhandledGuildChannelUpdate', "Channel '" + oldChannel.id + "' was edited but discord-logs couldn't find what was updated...", oldChannel.guild);
        });

        client.on("guildMemberBoost", (member: GuildMember) => {
            this.executeCustomActions('guildMemberBoost', {
                guild: member.guild,
                memberUser: member,
            });
            this.logMessage('guildMemberBoost', `<@${member.user.id}> (${member.user.tag}) has started boosting ${member.guild.name}`, member.guild);
        });

        client.on("guildMemberUnboost", (member: GuildMember) => {
            this.executeCustomActions('guildMemberUnboost', {
                guild: member.guild,
                memberUser: member,
            });
            this.logMessage('guildMemberUnboost', `<@${member.user.id}> (${member.user.tag}) has stopped boosting ${member.guild.name}...`, member.guild);
        });

        client.on("guildMemberRoleAdd", (member: GuildMember, role: Role) => {
            this.executeCustomActions('guildMemberRoleAdd', {
                guild: member.guild,
                memberUser: member,
                role: role,
            });
            this.logMessage('guildMemberRoleAdd', `<@${member.user.id}> (${member.user.tag}) acquired the role: ${role.name}`, member.guild);
        });

        client.on("guildMemberRoleRemove", (member: GuildMember, role: Role) => {
            this.executeCustomActions('guildMemberRoleRemove', {
                guild: member.guild,
                memberUser: member,
                role: role,
            });
            this.logMessage('guildMemberRoleRemove', `<@${member.user.id}> (${member.user.tag}) lost the role: ${role.name}`, member.guild);
        });

        client.on("guildMemberNicknameUpdate", (member: GuildMember, oldNickname: string, newNickname: string) => {
            this.executeCustomActions('guildMemberNicknameUpdate', {
                guild: member.guild,
                memberUser: member,
            });
            this.logMessage('guildMemberNicknameUpdate', `<@${member.user.id}> (${member.user.tag})'s nickname was ${oldNickname} and is now ${newNickname}`, member.guild);
        });

        client.on("unhandledGuildMemberUpdate", (oldMember: GuildMember, newMember: GuildMember) => {
            this.executeCustomActions('unhandledGuildMemberUpdate', {
                guild: newMember.guild,
                memberUser: newMember
            });
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

        client.on("messagePinned", async (message: Message) => {

            // Fetch the full message if partial.
            if (message.partial) await message.fetch();

            this.executeCustomActions('messagePinned', {
                guild: message.guild,
                message: message,
                channel: message.channel,
                memberUser: message.member
            });
            const channelName = ( < any > message.channel).name;
            this.logMessage('messagePinned', `Message https://discordapp.com/channels/${message.guild.id}/${message.channel.id}/${message.id} has been pinned to ${channelName}: \`\`\`${this.safe(message.cleanContent)}\`\`\``, message.guild);
        });

        client.on("messageContentEdited", async (message: Message, oldContent: string, newContent: string) => {
            
            // Fetch the full message if partial.
            if (message.partial) await message.fetch();

            this.executeCustomActions('messageContentEdited', {
                guild: message.guild,
                message: message,
                channel: message.channel,
                memberUser: message.member
            });
            this.logMessage('messageContentEdited', `Message https://discordapp.com/channels/${message.guild.id}/${message.channel.id}/${message.id} has been edited from \`\`\`${this.safe(oldContent)}\`\`\` to \`\`\`${this.safe(newContent)}\`\`\``, message.guild);
        });

        client.on("unhandledMessageUpdate", async (oldMessage: Message, newMessage: Message) => {
            
            // Fetch the full message if partial.
            if (oldMessage.partial) await oldMessage.fetch();
            if (newMessage.partial) await newMessage.fetch();

            this.executeCustomActions('unhandledMessageUpdate', {
                guild: newMessage.guild,
                message: newMessage,
                memberUser: newMessage.member,
                channel: newMessage.channel,
            });
            this.logMessage('unhandledMessageUpdate', `Message https://discordapp.com/channels/${oldMessage.guild.id}/${oldMessage.channel.id}/${oldMessage.id} was updated but the changes were not known` , oldMessage.guild);
        });

        client.on("guildMemberOffline", (member: GuildMember, oldStatus: Status) => {
            this.executeCustomActions('guildMemberOffline', {
                guild: member.guild,
                memberUser: member,
            });
            this.logMessage('guildMemberOffline', `<@${member.user.id}> (${member.user.tag}) became offline`, member.guild);
        });

        client.on("guildMemberOnline", (member: GuildMember, newStatus: Status) => {
            this.executeCustomActions('guildMemberOnline', {
                guild: member.guild,
                memberUser: member,
            });
            this.logMessage('guildMemberOnline', `<@${member.user.id}> (${member.user.tag}) was offline and is now ${newStatus}`, member.guild);
        });

        client.on("unhandledPresenceUpdate", (oldPresence: Presence, newPresence: Presence) => {
            this.executeCustomActions('unhandledPresenceUpdate', {
                guild: newPresence.guild,
                memberUser: newPresence.member,
            });
            this.logMessage('unhandledPresenceUpdate', `Presence for member <@${oldPresence.user.id}> (${oldPresence.user.tag}) was updated but the changes were not known`, oldPresence.guild);
        });

        client.on("rolePositionUpdate", (role: Role, oldPosition: number, newPosition: number) => {
            this.executeCustomActions('rolePositionUpdate', {
                guild: role.guild,
                role: role,
            });
            this.logMessage('rolePositionUpdate', role.name + " was at position " + oldPosition + " and now is at position " + newPosition, role.guild);
        });

        client.on("unhandledRoleUpdate", (oldRole: Role, newRole: Role) => {
            this.executeCustomActions('unhandledRoleUpdate', {
                guild: newRole.guild,
                role: newRole,
            });
            this.logMessage('unhandledRoleUpdate', "Role '" + oldRole.name + "' was updated but the changes were not nknown", oldRole.guild);
        });

        client.on("userAvatarUpdate", (user: User, oldAvatarURL: string, newAvatarURL: string) => {
            this.findGuildsForUser(user).then(guilds => {
                this.executeMultipleCustomActions('userAvatarUpdate', guilds, {
                    memberUser: user,
                });
                this.logMessageToMultiple('userAvatarUpdate', `<@${user.id}> (${user.tag}) avatar changed from ${oldAvatarURL} to ${newAvatarURL}`, guilds);
            })
        });

        client.on("userUsernameUpdate", (user: User, oldUsername: string, newUsername: string) => {
            this.findGuildsForUser(user).then(guilds => {
                this.executeMultipleCustomActions('userUsernameUpdate', guilds, {
                    memberUser: user,
                });
                this.logMessageToMultiple('userUsernameUpdate', `<@${user.id}> (${user.tag}) username changed from '${oldUsername}' to '${newUsername}'`, guilds);
            });
        });

        client.on("unhandledUserUpdate", (oldUser: User, newUser: User) => {
            this.findGuildsForUser(newUser).then(guilds => {
                this.logMessageToMultiple('unhandledUserUpdate', `User <@${newUser.id}> (${newUser.tag}) was updated but the changes were not known`, guilds);
            });
        });

        client.on("voiceChannelJoin", (member: GuildMember, channel: VoiceChannel) => {
            this.executeCustomActions('voiceChannelJoin', {
                guild: member.guild,
                memberUser: member,
                channel: channel,
            });
            this.logMessage('voiceChannelJoin', `<@${member.user.id}> (${member.user.tag}) joined voice channel '${channel.name}'`, member.guild);
        });

        client.on("voiceChannelLeave", (member: GuildMember, channel: VoiceChannel) => {
            this.executeCustomActions('voiceChannelLeave', {
                guild: member.guild,
                memberUser: member,
                channel: channel,
            });
            this.logMessage('voiceChannelLeave', `<@${member.user.id}> (${member.user.tag}) left voice channel '${channel.name}'`, member.guild);
        });

        client.on("voiceChannelSwitch", (member: GuildMember, oldChannel: VoiceChannel, newChannel: VoiceChannel) => {
            this.executeCustomActions('voiceChannelSwitch', {
                guild: member.guild,
                memberUser: member,
                channel: newChannel,
            });
            this.logMessage('voiceChannelSwitch', `<@${member.user.id}> (${member.user.tag}) left voice channel '${oldChannel.name}' and joined voice channel '${newChannel.name}'`, member.guild);
        });

        client.on("voiceChannelMute", (member: GuildMember, muteType: string) => {
            this.executeCustomActions('voiceChannelMute', {
                guild: member.guild,
                memberUser: member,
            });
            this.logMessage('voiceChannelMute', `<@${member.user.id}> (${member.user.tag}) is now ${muteType}`, member.guild);
        });

        client.on("voiceChannelDeaf", (member: GuildMember, deafType: string) => {
            this.executeCustomActions('voiceChannelDeaf', {
                guild: member.guild,
                memberUser: member,
            });
            this.logMessage('voiceChannelDeaf', `<@${member.user.id}> (${member.user.tag}) is now ${deafType}`, member.guild);
        });

        client.on("voiceChannelUnmute", (member: GuildMember, muteType: string) => {
            this.executeCustomActions('voiceChannelUnmute', {
                guild: member.guild,
                memberUser: member,
            });
            this.logMessage('voiceChannelUnmute', `<@${member.user.id}> (${member.user.tag}) is now unmuted`, member.guild);
        });

        client.on("voiceChannelUndeaf", (member: GuildMember, deafType: string) => {
            this.executeCustomActions('voiceChannelUndeaf', {
                guild: member.guild,
                memberUser: member,
            });
            this.logMessage('voiceChannelUndeaf', `<@${member.user.id}> (${member.user.tag}) is now undeafened`, member.guild);
        });

        client.on("voiceStreamingStart", (member: GuildMember, voiceChannel: VoiceChannel) => {
            this.executeCustomActions('voiceStreamingStart', {
                guild: member.guild,
                memberUser: member,
                channel: voiceChannel,
            });
            this.logMessage('voiceStreamingStart',`<@${member.user.id}> (${member.user.tag}) started streaming in ${voiceChannel.name}`, member.guild);
        });

        client.on("voiceStreamingStop", (member: GuildMember, voiceChannel: VoiceChannel) => {
            this.executeCustomActions('voiceStreamingStop', {
                guild: member.guild,
                memberUser: member,
                channel: voiceChannel,
            });
            this.logMessage('voiceStreamingStop', `<@${member.user.id}> (${member.user.tag}) stopped streaming`, member.guild);
        });

        client.on("unhandledVoiceStateUpdate", (oldState: VoiceState, newState: VoiceState) => {
             this.logMessage('unhandledVoiceUpdate', `Voice state for member <@${oldState.member.user.id}> (${oldState.member.user.tag}) was updated but the changes were not known`, oldState.guild);
        });

        client.on("guildMemberAdd", (member) => {
            this.executeCustomActions('guildMemberAdd', {
                guild: member.guild,
                memberUser: <any>member,
            });
            this.logMessage('guildMemberAdd', `<@${member.user.id}> (${member.user.tag}) has joined`, member.guild);
        });

        client.on("guildMemberRemove", (member) => {
            this.executeCustomActions('guildMemberRemove', {
                guild: member.guild,
                memberUser: <any>member,
            });
            this.logMessage('guildMemberRemove', `<@${member.user.id}> (${member.user.tag}) has left/been kicked or banned`, member.guild);
        });

        client.on("messageReactionAdd", async (messageReaction, user) => {

            if (messageReaction.partial) await messageReaction.fetch();
            
            // Fetch the full message associated with the reaction.
            if (messageReaction.message.partial) await messageReaction.message.fetch();

            this.findMembersForUser(user, [messageReaction.message.guild]).then(members => {
                if (!!members) {
                    let firstMember = members[0];
                    this.executeCustomActions('messageReactionAdd', {
                        guild: messageReaction.message.guild,
                        memberUser: <any>firstMember,
                        reaction: messageReaction,
                        message: messageReaction.message,
                        emoji: messageReaction.emoji
                    });
                }
            });
            this.logMessage('messageReactionAdd', `<@${user.id}> (${user.tag}) has reacted with ${messageReaction.emoji.name} (${messageReaction.emoji.url}) to message https://discordapp.com/channels/${messageReaction.message.guild.id}/${messageReaction.message.channel.id}/${messageReaction.message.id} `, messageReaction.message.guild);
        });

        client.on("messageReactionRemove", async (messageReaction, user) => {

            if (messageReaction.partial) await messageReaction.fetch();

            // Fetch the full message associated with the reaction.
            if (messageReaction.message.partial) await messageReaction.message.fetch();

            this.findMembersForUser(user, [messageReaction.message.guild]).then(members => {
                if (!!members) {
                    let firstMember = members[0];
                    this.executeCustomActions('messageReactionRemove', {
                        guild: messageReaction.message.guild,
                        memberUser: <any>firstMember,
                        reaction: messageReaction,
                        message: messageReaction.message,
                        emoji: messageReaction.emoji
                    });
                }
            });
            this.logMessage('messageReactionRemove', `<@${user.id}> (${user.tag}) has removed reaction ${messageReaction.emoji.name} (${messageReaction.emoji.url}) to message https://discordapp.com/channels/${messageReaction.message.guild.id}/${messageReaction.message.channel.id}/${messageReaction.message.id} `, messageReaction.message.guild);
        });

        client.on("messageReactionRemoveAll", async (message: Message) => {

            // Fetch the full message.
            if (message.partial) await message.fetch();

            this.executeCustomActions('messageReactionRemoveAll', {
                guild: message.guild,
                memberUser: message.member,
                message: message
            });
            this.logMessage('messageReactionRemoveAll', `Message https://discordapp.com/channels/${message.guild.id}/${message.channel.id}/${message.id} has had all reactions removed`, message.guild);
        });

        client.on("messageDelete", async (message) => {

            // Fetch the full message if partial.
            if (message.partial) await message.fetch();

            const hasAttachment = message.attachments.size > 0;
            let attachmentUrl = '';
            if (hasAttachment) {
                attachmentUrl = message.attachments.first().proxyURL;
            }
            const channelName = ( < any > message.channel).name;
            this.executeCustomActions('messageDelete', {
                guild: message.guild,
                message: message,
                channel: message.channel,
                memberUser: message.member
            });
            this.logMessage('messageDelete', `<@${message.author.id}> (${message.author.tag})'s message \`\`\`${this.safe(message.cleanContent)}\`\`\` ${(hasAttachment ? ' with attachment ' + attachmentUrl : '')} from ${channelName} was deleted`, message.guild);
        });

        client.on("messageDeleteBulk", (messages) => {
            this.logMessage('messageDeleteBulk', `${messages.size} messages were deleted.`, messages.first().guild);
        });

        client.on("guildCreate", guild => {
            console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
            
            // Start by getting or creating the guild.
            ConfigDatabase.getOrAddGuild(guild).then(guildConfig => {
                if (guildConfig.logChannelId === '') {
                    // New or unset channel.
                    console.log(`Guild has not been configured with a channel yet.`);
                }
            });

            client.user.setActivity(`Serving ${client.guilds.cache.size} servers`);
        });

        client.on("message", async message => { 

            // Fetch the full message if partial.
            if (message.partial) await message.fetch();

            // Skip itself, do not allow it to process its own messages.
            if (message.author.id === client.user.id) return;

            // First of all give the details to custom actions and log message.
            this.executeCustomActions('message', {
                guild: message.guild,
                message: message,
                channel: message.channel,
                memberUser: message.member
            });
            this.logMessage('message', `<@${message.author.id}> (${message.author.tag}) posted message: \`\`\`${this.safe(message.cleanContent)}\`\`\``, message.guild);
        
            // Skip other bots now.
            if (message.author.bot) return;

            // Check for prefix.
            if (message.content.indexOf('!') !== 0) return;

            const args = message.content.slice(1).trim().split(/ +/g);
            const command = args.shift().toLowerCase();

            
            if (command === 'setlogchannel') {
                if (!message.member.hasPermission("ADMINISTRATOR")) {
                    return;
                }
                let channelMentions = message.mentions.channels;
                if (channelMentions.size > 0) {
                    let firstChannel = channelMentions.keys().next().value;
                    ConfigDatabase.updateGuildLogChannel(message.guild, firstChannel).then(x => {
                        if (x.ok) {
                            message.reply(`Set the log channel to ${firstChannel}`);
                        } else {
                            message.reply(`Failed to set the log channel to ${firstChannel}`);
                        }
                    });
                }
            } else if (!commands.includes(command)) {
                return;
            }

            // Only allow commands to be executed in the log channel.
            ConfigDatabase.getOrAddGuild(message.guild).then(guildConfig => {
                if (message.channel.id !== guildConfig.logChannelId) {
                    return;
                }

                if (command === 'addevents') {
                    let events = args;
                    if (events.length > 0) {
                        ConfigDatabase.addGuildEvents(message.guild, events).then(x => {
                            if (x.ok) {
                                message.reply(`Successfully added ${events.length} event(s) to be logged.`);
                            } else {
                                message.reply(`Failed to add the events.`);
                            }
                        });
                    }
                }

                if (command === 'removeevents' || command === 'deleteevents') {
                    let events = args;
                    if (events.length > 0) {
                        ConfigDatabase.removeGuildEvents(message.guild, events).then(x => {
                            if (x.ok) {
                                message.reply(`Successfully removed ${events.length} event(s) from being logged.`);
                            } else {
                                message.reply(`Failed to remove the events.`);
                            }
                        });
                    }
                }

                if (command === 'events' || command === 'listevents') {
                    ConfigDatabase.getGuildEvents(message.guild).then(events => {
                        let formattedEvents = `Actively Logged Events: 
\`\`\`
${events.join('\n').trim()}
\`\`\``;
                        message.reply(formattedEvents);
                    });
                }

                if (command === 'addeventaction' && args.length > 1) {
                    let [event, ...other] = args;
                    let code = other.join(' ').replace(/`/g, '');
                    let action: GuildEventAction = {
                        event: event,
                        actionCode: code,
                    };
                    ConfigDatabase.addGuildEventActionsForEvent(message.guild, [action]).then(result => {
                        if (result.ok) {
                            message.reply('Successfully added an event action.');
                        } else {
                            message.reply('Failed to add an event action.');
                        }
                    })
                }

                if (command === 'removeeventaction' && args.length === 1) {
                    ConfigDatabase.removeGuildEventActions(message.guild, [new ObjectId(args[0])]).then(result => {
                        if (result.ok) {
                            message.reply(`Successfully removed an event action with identifier ${args[0]}.`)
                        } else {
                            message.reply('Failed to remove an event action with that identifier.');
                        }
                    })
                }
                
                if (command === 'listeventactions' || command === 'eventactions') {
                    ConfigDatabase.getGuildEventActions(message.guild).then(actions => {
                        let formattedActions = `Event Actions in Place: `;
                        let messageQueue = [];
                        for (const act of actions) {
                            const textToAdd = `
\`\`\`
Identifier: ${act.id.toHexString()}
Event: ${this.safe(act.event)}
Code: ${this.safe(act.actionCode)}
\`\`\``;
                            if ((formattedActions + textToAdd).length >= 2000) {
                                messageQueue.push(formattedActions);
                                formattedActions = `Event Actions in Place: `;
                            }
                            formattedActions += textToAdd;
                        }

                        messageQueue.push(formattedActions);

                        for (const msg of messageQueue) {
                            if (msg !== '') {
                                message.reply(msg);
                            }
                        }
                    });
                }
            });
        });

        client.on('ready', () => {
            console.log(`Bot has started, with ${client.users.cache.size} users in cache, in ${client.channels.cache.size} cached channels of ${client.guilds.cache.size} cached guilds.`); 
            client.user.setActivity(`Serving ${client.guilds.cache.size} servers`);
            console.log(`Logged in as ${client.user.tag}!`);
        });

        client.login(Config.BotToken);
    }
}

export = new Bot();
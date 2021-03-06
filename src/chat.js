/**
 * @global
 */
class Chat {

	static EVENT = {
		GLOBAL_MESSAGE: "globalMessage",
		NETWORK_MESSAGE: "networkMessage",
		CHANNEL_LIST: "channelList",
		CHANNEL_JOIN: "channelJoin",
		CHANNEL_TOPIC: "channelTopic",
		CHANNEL_DISCONNECT: "channelDisconnect",
		CHANNEL_RECONNECT: "channelReconnect",
		CHANNEL_LEAVE: "channelLeave",
		CHANNEL_MESSAGE: "channelMessage",
		CHANNEL_PRIVATE_MESSAGE: "channelPrivateMessage",
		CHANNEL_DELETE: "channelDelete",
		CHANNEL_MESSAGE_USER: "channelMessageUser",
		CHANNEL_USER_JOINED: "channelUserJoined",
		CHANNEL_USER_LEFT: "channelUserLeft",
		USER_RENAME: "userRename",
		USER_RENAMED: "userRenamed"
	}

	static MAXIMUM_TOPIC_LENGTH = 200
	static MAXIMUM_MESSAGE_LENGTH = 200
	static PREFIX_CHANNEL = "#"
	static PREFIX_OWNER = "@"
	static DEFAULT_NICKNAME = "Anon"
	static DEFAULT_TOPIC = "Topic not set. Use /topic to change the topic."
	static ALLOWED_CHARACTERS_NICKNAME = [ ..."abcdefghijklmnopqrstuvwxyz1234567890-_" ]
	static ALLOWED_CHARACTERS_CHANNEL = [ ..."abcdefghijklmnopqrstuvwxyz1234567890" ]

	/**
	 * @param {object} database
	 */
	constructor(database) {
		this._database = database
	}

	/**
	 * @readonly
	 * @type {object}
	 */
	get database() {
		return this._database
	}

}

export default Chat

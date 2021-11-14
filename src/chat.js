/**
 * @global
 */
class Chat {

	static EVENT = {
		CHANNEL_LIST: "channelList",
		CHANNEL_JOIN: "channelJoin",
		CHANNEL_TOPIC: "channelTopic",
		CHANNEL_DISCONNECT: "channelDisconnect",
		CHANNEL_RECONNECT: "channelReconnect",
		CHANNEL_LEAVE: "channelLeave",
		CHANNEL_MESSAGE: "channelMessage",
		CHANNEL_DELETE: "channelDelete",
		USER_RENAME: "userRename",
		USER_JOINED: "userJoined",
		USER_MESSAGE: "userMessage",
		USER_LEFT: "userLeft",
		USER_RENAMED: "userRenamed",
		USER_NICKNAME_SET: "userNicknameSet",
	}

	static MAXIMUM_TOPIC_LENGTH = 200
	static MAXIMUM_MESSAGE_LENGTH = 200
	static PREFIX_CHANNEL = "#"
	static PREFIX_OWNER = "@"
	static DEFAULT_NICKNAME = "Anon"
	static DEFAULT_TOPIC = "Topic not set. Use /topic to change the topic."
	static ALLOWED_CHARACTERS_NICKNAME = [..."abcdefghijklmnopqrstuvwxyz1234567890-_"]
	static ALLOWED_CHARACTERS_CHANNEL = [..."abcdefghijklmnopqrstuvwxyz1234567890"]

	/**
	 * @param {object} database
	 */
	constructor(database) {
		this._database = database
		this._user = null
	}

	/**
	 * @readonly
	 * @type {object}
	 */
	get database() {
		return this._database
	}

	/**
	 * @type {object}
	 */
	get user() {
		return this._user
	}

	set user(user) {
		this._user = user
	}

}

export default Chat

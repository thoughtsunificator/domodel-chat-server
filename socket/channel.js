import Chat from "../src/chat.js"
import SocketListener from "../src/socket-listener.js"

/**
 * @global
 */
class ChannelEventListener extends SocketListener {

	/**
	 * @param {string} query
	 */
	channelList(query) {
		if(typeof query !== "string") {
			return
		}
		if(query !== null) {
			this.socket.emit(Chat.EVENT.CHANNEL_LIST, this.chat.channels.filter(channel => channel.name.toLowerCase().includes(query.toLowerCase())))
		} else {
			this.socket.emit(Chat.EVENT.CHANNEL_LIST, this.chat.channels)
		}
	}

	/**
	 * @param {string} name
	 */
	channelJoin(name) {
		if(typeof name !== "string") {
			return
		}
		const chars = [ ...name ]
		const invalidChannelNameMessage = {
			source: "---", time: new Date().getTime(),
			message: `"${name}": :Illegal channel name.`,
		}
		if(name.trim().length === 0 || chars.length < 3) {
			this.socket.emit(Chat.EVENT.CHANNEL_MESSAGE, { message: invalidChannelNameMessage })
			return
		} else if(chars[0] !== "#") {
			this.socket.emit(Chat.EVENT.CHANNEL_MESSAGE, { message: invalidChannelNameMessage })
			return
		}
		for(const char of chars.slice(1)) {
			if(Chat.ALLOWED_CHARACTERS_CHANNEL.includes(char.toLowerCase()) === false) {
					this.socket.emit(Chat.EVENT.CHANNEL_MESSAGE, { message: invalidChannelNameMessage })
					return
			}
		}
		let channel = this.chat.channels.find(channel => channel.name === name)
		if (typeof channel !== "undefined") {
			const channelUsers = channel.users.map(userId => this.chat.users.find(user => user.id === userId))
			const nicknames = channelUsers.map(user => user.nickname)
			const renamed = nicknames.includes(this.chat.user.nickname)
			let nickname = this.chat.user.nickname
			while (nicknames.includes(nickname)) {
				nickname += "_"
			}
			if (renamed === true) {
				this.socket.emit(Chat.EVENT.USER_RENAME, nickname)
				const message = {
					message: `${this.chat.user.nickname} has renamed to ${nickname}`,
					source: "---", time: new Date().getTime(),
				}
				const userChannels = this.chat.channels.filter(channel => channel.users.includes(this.socket.id) === true)
				this.chat.user.nickname = nickname
				for (const channel of userChannels) {
					this.io.in(channel.name).emit(Chat.EVENT.USER_RENAMED, { channel, nickname, userId: this.socket.id, users: this.chat.users })
					this.io.in(channel.name).emit(Chat.EVENT.CHANNEL_MESSAGE, { channel, message })
					channel.messages.push(message)
				}
			}
			channel.users.push(this.socket.id)
		} else {
			channel = {
				owner: this.socket.id,
				topic: "Topic not set. Use /topic to change the topic.",
				name,
				users: [this.socket.id],
				messages: []
			}
			this.chat.channels.push(channel)
		}
		const message = { source: "---", time: new Date().getTime(), message: `${this.chat.user.nickname} has joined ${name}`, }
		this.socket.join(name)
		this.socket.emit(Chat.EVENT.CHANNEL_JOIN, { channel, users: this.chat.users, nickname: this.chat.user.nickname})
		this.socket.emit(Chat.EVENT.CHANNEL_MESSAGE, { channel, message: { source: "---", time: new Date().getTime(), message: `You are now talking on ${name}`, } })
		this.socket.broadcast.to(name).emit(Chat.EVENT.USER_JOINED, { channel, user: this.chat.user, users: this.chat.users})
		this.socket.broadcast.to(name).emit(Chat.EVENT.CHANNEL_MESSAGE, { channel, message })
		channel.messages.push(message)
	}

	/**
	 * @param {object} data
	 * @param {string} data.channelName
	 * @param {object} data.message
	 * @param {string} data.message.message
	 */
	channelMessage(data) {
		if(typeof data !== "object") {
			return
		}
		const { channelName, message } = data
		if(typeof channelName !== "string" || typeof message !== "object" || typeof message.message !== "string") {
			return
		}
		if(message.message.length === 0 || message.message.length > Chat.MAXIMUM_MESSAGE_LENGTH) {
			return
		}
		message.time = new Date().getTime()
		const channel = this.chat.channels.find(channel => channel.name === channelName)
		channel.messages.push(message)
		this.io.in(channelName).emit(Chat.EVENT.CHANNEL_MESSAGE, data)
	}

	/**
	 * @param {string} name
	 */
	channelReconnect(name) {
		if(typeof name !== "string") {
			return
		}
		console.log(`reconnecting to ${name} (${this.socket.id})`)
		let channel = this.chat.channels.find(channel => channel.name === name)
		if (typeof channel !== "undefined") {
			const channelUsers = channel.users.map(userId => this.chat.users.find(user => user.id === userId))
			const nicknames = channelUsers.map(user => user.nickname)
			const renamed = nicknames.includes(this.chat.user.nickname)
			let nickname = this.chat.user.nickname
			while (nicknames.includes(nickname)) {
				nickname += "_"
			}
			if (renamed === true) {
				this.socket.emit(Chat.EVENT.USER_RENAME, nickname)
				const message = {
					source: "---", time: new Date().getTime(),
					message: `${this.chat.user.nickname} has renamed to ${nickname}`,
				}
				const userChannels = this.chat.channels.filter(channel => channel.users.includes(this.socket.id) === true)
				this.chat.user.nickname = nickname
				for (const channel of userChannels) {
					this.io.in(channel.name).emit(Chat.EVENT.USER_RENAMED, { channel, nickname, userId: this.socket.id, users: this.chat.users })
					this.io.in(channel.name).emit(Chat.EVENT.CHANNEL_MESSAGE, { channel, message })
					channel.messages.push(message)
				}
			}
			channel.users.push(this.socket.id)
		} else {
			channel = {
				owner: this.socket.id,
				topic: "Topic not set. Use /topic to change the topic.",
				name,
				users: [this.socket.id],
				messages: []
			}
			this.chat.channels.push(channel)
		}
		const message = {
			source: "---", time: new Date().getTime(),
			message: `${this.chat.user.nickname} has joined ${name}`
		}
		this.socket.join(name)
		this.socket.emit(Chat.EVENT.CHANNEL_RECONNECT, { channel, users: this.chat.users, nickname: this.chat.user.nickname})
		this.socket.emit(Chat.EVENT.CHANNEL_MESSAGE, { channel, message: { source: "---", time: new Date().getTime(), message: `You are now talking on ${name}`, } })
		this.socket.broadcast.to(name).emit(Chat.EVENT.USER_JOINED, { channel, user: this.chat.user, users: this.chat.users })
		this.socket.broadcast.to(name).emit(Chat.EVENT.CHANNEL_MESSAGE, { channel, message })
		channel.messages.push(message)
	}

	/**
	 * @param {string} name
	 */
	channelLeave(name) {
		if(typeof name !== "string") {
			return
		}
		const channel = this.chat.channels.find(channel => channel.name === name)
		channel.users.splice(channel.users.indexOf(this.socket.id), 1)
		const message = {
			source: "---", time: new Date().getTime(),
			message: `${this.chat.user.nickname} has left ${name}`,
		}
		this.socket.leave(name)
		this.socket.emit(Chat.EVENT.CHANNEL_LEAVE, channel)
		this.socket.broadcast.to(name).emit(Chat.EVENT.CHANNEL_MESSAGE, { channel, message })
		this.socket.broadcast.to(name).emit(Chat.EVENT.USER_LEFT, { channel, userId: this.socket.id, users: this.chat.users})
		channel.messages.push(message)
	}

	/**
	 * @param {string} name
	 */
	channelDisconnect(name) {
		if(typeof name !== "string") {
			return
		}
		const channel = this.chat.channels.find(channel => channel.name === name)
		channel.users.splice(channel.users.indexOf(this.socket.id), 1)
		const message = {
			message: `${this.chat.user.nickname} has left ${name}`,
			source: "---", time: new Date().getTime(),
		}
		this.socket.leave(name)
		this.socket.emit(Chat.EVENT.CHANNEL_MESSAGE, { channel, message: { source: "---", time: new Date().getTime(), message: ` You have left channel ${name}`, } })
		this.socket.emit(Chat.EVENT.CHANNEL_DISCONNECT, channel)
		this.socket.broadcast.to(name).emit(Chat.EVENT.CHANNEL_MESSAGE, { channel, message })
		this.socket.broadcast.to(name).emit(Chat.EVENT.USER_LEFT, { channel, userId: this.socket.id, users: this.chat.users })
		channel.messages.push(message)
	}

	/**
	 * @param {object} data
	 * @param {string} data.topic
	 * @param {string} data.name
	 */
	channelTopic(data) {
		if(typeof data !== "object") {
			return
		}
		const { topic, name } = data
		if(typeof topic !== "string" || typeof name !== "string" || topic.length > Chat.MAXIMUM_TOPIC_LENGTH) {
			return
		}
		const channel =  this.chat.channels.find(channel => channel.name === name)
		if (channel.owner === this.socket.id) {
			channel.topic = topic
			this.io.in(name).emit(Chat.EVENT.CHANNEL_TOPIC, data)
			const message = {
				source: "---", time: new Date().getTime(),
				message: `Topic was set to "${topic}"`,
			}
			this.io.in(name).emit(Chat.EVENT.CHANNEL_MESSAGE, { channel, message})
			channel.messages.push(message)
		} else {
			this.socket.emit(Chat.EVENT.CHANNEL_MESSAGE, {
				message: {
					source: "---", time: new Date().getTime(),
					message: `You are not the owner of ${name}`,
				}
			})
		}
	}

	/**
	 * @param {string} name
	 */
	channelDelete(name) {
		if(typeof name !== "string") {
			return
		}
		const channel =  this.chat.channels.find(channel => channel.name === name)
		if (typeof channel === "undefined") {
			this.socket.emit(Chat.EVENT.CHANNEL_MESSAGE, {
				message: {
					source: "---", time: new Date().getTime(),
					message: `${name} does not exist`,
				}
			})
		} else if(channel.owner === this.socket.id) {
			this.io.in(name).emit(Chat.EVENT.CHANNEL_LEAVE, channel)
			this.socket.leave(name)
			this.chat.channels.splice(this.chat.channels.indexOf(channel), 1)
		} else {
			this.socket.emit(Chat.EVENT.CHANNEL_MESSAGE, {
				message: {
					source: "---", time: new Date().getTime(),
					message: `You are not the owner of ${name}`,
				}
			})
		}
	}

}

export default ChannelEventListener

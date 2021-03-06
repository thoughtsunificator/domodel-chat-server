import Chat from "../src/chat.js"
import SocketListener from "../src/socket-listener.js"

/**
 * @global
 */
class ChannelEventListener extends SocketListener {

	/**
	 * @param {string} query
	 */
	async channelList(query) {
		if(typeof query !== "string") {
			return
		}
		const collection = this.chat.database.collection("channels")
		const channels = await collection.find().toArray()
		if(query !== null) {
			this.socket.emit(Chat.EVENT.CHANNEL_LIST, channels.filter(channel => channel.name.toLowerCase().includes(query.toLowerCase())))
		} else {
			this.socket.emit(Chat.EVENT.CHANNEL_LIST, channels)
		}
	}

	/**
	 * @param {string} name
	 */
	async channelJoin(name) {
		if(typeof name !== "string") {
			return
		}
		const characters = [ ...name ]
		const invalidChannelNameMessage = {
			source: "---",
			date: new Date(),
			content: `"${name}": :Illegal channel name.`,
		}
		if(name.trim().length === 0 || characters.length < 3) {
			this.socket.emit(Chat.EVENT.NETWORK_MESSAGE, { message: invalidChannelNameMessage })
			return
		} else if(characters[0] !== "#") {
			this.socket.emit(Chat.EVENT.NETWORK_MESSAGE, { message: invalidChannelNameMessage })
			return
		}
		for(const character of characters.slice(1)) {
			if(Chat.ALLOWED_CHARACTERS_CHANNEL.includes(character.toLowerCase()) === false) {
				this.socket.emit(Chat.EVENT.NETWORK_MESSAGE, { message: invalidChannelNameMessage })
				return
			}
		}
		const collection = this.chat.database.collection("channels")
		let channel = await collection.findOne({ name })
		if (channel) {
			const nicknames = channel.users.filter(user => user.socketId !== this.socket.id).map(user => user.nickname)
			const renamed = nicknames.includes(this.data.nickname)
			let nickname = this.data.nickname
			while (nicknames.includes(nickname)) {
				nickname += "_"
			}
			if (renamed === true) {
				this.socket.emit(Chat.EVENT.USER_RENAME, nickname)
				const message = {
					content: `${this.data.nickname} has renamed to ${nickname}`,
					source: "---",
					date: new Date(),
				}
				this.socket.emit(Chat.EVENT.NETWORK_MESSAGE, { message })
				const userChannels = await collection.find({ users: { $elemMatch: { socketId: this.socket.id }} }).toArray()
				this.data.nickname = nickname
				await collection.updateMany({}, { "$set": { "users.$[elem].nickname": nickname } }, { "arrayFilters": [{ "elem.socketId": this.socketId }], "multi": true })
				for (const channel of userChannels) {
					this.io.in(channel.name).emit(Chat.EVENT.USER_RENAMED, { channelName: channel.name, nickname, socketId: this.socket.id })
					this.io.in(channel.name).emit(Chat.EVENT.CHANNEL_MESSAGE, { channelName: channel.name, message })
				}
			}
			channel = (await collection.findOneAndUpdate(
				{ name },
				{ $push : { "users" : { nickname: this.data.nickname, socketId: this.socket.id } } },
				{ returnDocument: "after" },
			)).value
		} else {
			await collection.insertOne({
				topic: Chat.DEFAULT_TOPIC,
				name,
				owner: this.data.nickname,
				users: [ { socketId: this.socket.id, nickname: this.data.nickname } ],
			})
			channel = await collection.findOne({ name })
		}
		this.socket.join(name)
		this.socket.emit(Chat.EVENT.CHANNEL_JOIN, {
			channel: {
				name: channel.name,
				owner: channel.owner,
				topic: channel.topic,
				users: channel.users,
				messages: [{
					source: "---",
					date: new Date(),
					content: `Now talking on ${name}`,
				}]
			},
		nickname: this.data.nickname
	})
		this.socket.broadcast.to(name).emit(Chat.EVENT.CHANNEL_USER_JOINED, { channelName: name,  user: { socketId: this.socket.id, nickname: this.data.nickname } })
		this.socket.broadcast.to(name).emit(Chat.EVENT.CHANNEL_MESSAGE, { channelName: name, message: {
			source: "---",
			date: new Date(),
			content: `${this.data.nickname} has joined ${name}`
		} })
	}

	/**
	 * @param {object} data
	 * @param {string} data.channelName
	 * @param {object} data.message
	 * @param {string} data.message.content
	 */
	async channelMessage(data) {
		if(typeof data !== "object") {
			return
		}
		const { channelName, message } = data
		if(typeof channelName !== "string" || typeof message !== "object" || typeof message.content !== "string") {
			return
		}
		if(message.content.length === 0 || message.content.length > Chat.MAXIMUM_MESSAGE_LENGTH) {
			return
		}
		message.date = new Date()
		const collection = this.chat.database.collection("channels")
		let channel = await collection.findOne({ name: channelName })
		this.io.in(channelName).emit(Chat.EVENT.CHANNEL_MESSAGE, data)
	}

	/**
	 * @param {object} data
	 * @param {string} data.channelName
	 * @param {string} data.nickname
	 * @param {string} data.content
	 */
	async channelMessageUser(data) {
		if(typeof data !== "object") {
			return
		}
		const { channelName, nickname, content } = data
		if(typeof channelName !== "string" || typeof nickname !== "string" || typeof content !== "string") {
			return
		}
		if(content.length === 0 || content.length > Chat.MAXIMUM_MESSAGE_LENGTH) {
			return
		}
		const collection = this.chat.database.collection("channels")
		const channel = await collection.findOne({ name: channelName })
		const user = channel.users.find(user => user.nickname === nickname)
		if(typeof user === "undefined") {
			this.socket.emit(Chat.EVENT.NETWORK_MESSAGE, {
				message: {
					source: "---",
					date: new Date(),
					content: `${data.nickname} was not found in ${data.channelName}.`,
				}
			})
		} else {
			this.socket.emit(Chat.EVENT.CHANNEL_PRIVATE_MESSAGE, {
				channelName,
				message: {
					source: "---",
					date: new Date(),
					content: `To ${nickname}: ${content}`,
				}
			})
			this.io.to(user.socketId).emit(Chat.EVENT.CHANNEL_PRIVATE_MESSAGE, {
				channelName,
				message: {
					source: "---",
					date: new Date(),
					content: `From ${this.data.nickname}: ${content}`,
				}
			})
		}
	}

	/**
	 * @param {string} name
	 */
	async channelReconnect(name) {
		if(typeof name !== "string") {
			return
		}
		console.log(`reconnecting to ${name} (${this.socket.id})`)
		const collection = this.chat.database.collection("channels")
		let channel = await collection.findOne({ name })
		if (channel) {
			const nicknames = channel.users.filter(user => user.socketId !== this.socket.id).map(user => user.nickname)
			const renamed = nicknames.includes(this.data.nickname)
			let nickname = this.data.nickname
			while (nicknames.includes(nickname)) {
				nickname += "_"
			}
			if (renamed === true) {
				this.socket.emit(Chat.EVENT.USER_RENAME, nickname)
				const message = {
					source: "---",
					date: new Date(),
					content: `${this.data.nickname} has renamed to ${nickname}`,
				}
				this.socket.emit(Chat.EVENT.NETWORK_MESSAGE, { message })
				this.data.nickname = nickname
				const userChannels = await collection.find({ users: { $elemMatch: { socketId: this.socket.id }} }).toArray()
				await collection.update({}, { "$set": { "users.$[elem].nickname": nickname } }, { "arrayFilters": [{ "elem.socketId": this.socketId }], "multi": true })
				for (const channel of userChannels) {
					this.io.in(channel.name).emit(Chat.EVENT.USER_RENAMED, { channelName: channel.name, nickname, socketId: this.socket.id })
					this.io.in(channel.name).emit(Chat.EVENT.CHANNEL_MESSAGE, { channelName: channel.name, message })
				}
			}
			channel = (await collection.findOneAndUpdate(
				{ name },
				{ $push : { "users" : { nickname: this.data.nickname, socketId: this.socket.id } } },
				{ returnDocument: "after" },
			)).value
		} else {
			await collection.insertOne({
				topic: Chat.DEFAULT_TOPIC,
				name,
				owner: this.data.nickname,
				users: [ { socketId: this.socket.id, nickname: this.data.nickname } ],
			})
			channel = await collection.findOne({ name })
		}
		const message = {
			source: "---",
			date: new Date(),
			content: `${this.data.nickname} has joined ${name}`
		}
		this.socket.join(name)
		this.socket.emit(Chat.EVENT.CHANNEL_RECONNECT, {
			channel: {
				name: channel.name,
				owner: channel.owner,
				topic: channel.topic,
				users: channel.users
			},
			nickname: this.data.nickname
		})
		this.socket.broadcast.to(name).emit(Chat.EVENT.CHANNEL_USER_JOINED, { channelName: name, user: { socketId: this.socket.id , nickname: this.data.nickname } })
		this.socket.broadcast.to(name).emit(Chat.EVENT.CHANNEL_MESSAGE, { channelName: channel.name, message })
	}

	/**
	 * @param {string} name
	 */
	async channelLeave(name) {
		if(typeof name !== "string") {
			return
		}
		const collection = this.chat.database.collection("channels")
		const channel = await collection.findOne({ name })
		await collection.updateMany({ name }, { $pull : { "users" : { "socketId": this.socket.id } } })
		const message = {
			source: "---",
			date: new Date(),
			content: `${this.data.nickname} has left ${name}`,
		}
		this.socket.leave(name)
		this.socket.emit(Chat.EVENT.CHANNEL_LEAVE, name)
		this.socket.broadcast.to(name).emit(Chat.EVENT.CHANNEL_MESSAGE, { channelName: channel.name, message })
		this.socket.broadcast.to(name).emit(Chat.EVENT.CHANNEL_USER_LEFT, { channelName: name, socketId: this.socket.id })
	}

	/**
	 * @param {string} name
	 */
	async channelDisconnect(name) {
		if(typeof name !== "string") {
			return
		}
		const collection = this.chat.database.collection("channels")
		const channel = await collection.findOne({ name })
		await collection.updateMany({ name }, { $pull : { "users" : { "socketId": this.socket.id } } })
		const message = {
			content: `${this.data.nickname} has left ${name}`,
			source: "---",
			date: new Date(),
		}
		this.socket.leave(name)
		this.socket.emit(Chat.EVENT.CHANNEL_MESSAGE, { channelName: name, message: {
			source: "---",
			date: new Date(),
			content: ` You have left channel ${name}` }
		})
		this.socket.emit(Chat.EVENT.CHANNEL_DISCONNECT, name)
		this.socket.broadcast.to(name).emit(Chat.EVENT.CHANNEL_MESSAGE, { channelName: name, message })
		this.socket.broadcast.to(name).emit(Chat.EVENT.CHANNEL_USER_LEFT, { channelName: name, socketId: this.socket.id })
	}

	/**
	 * @param {object} data
	 * @param {string} data.topic
	 * @param {string} data.name
	 */
	async channelTopic(data) {
		if(typeof data !== "object") {
			return
		}
		const { topic, name } = data
		if(typeof topic !== "string" || typeof name !== "string" || topic.length > Chat.MAXIMUM_TOPIC_LENGTH) {
			return
		}
		const collection = this.chat.database.collection("channels")
		const channel = await collection.findOne({ name })
		if (channel.owner === this.data.nickname) {
			channel.topic = topic
			this.io.in(name).emit(Chat.EVENT.CHANNEL_TOPIC, data)
			const message = {
				source: "---",
				date: new Date(),
				content: `Topic was set to "${topic}"`,
			}
			await collection.updateOne({ name }, { $set: { topic }})
			this.io.in(name).emit(Chat.EVENT.CHANNEL_MESSAGE, { channelName: channel.name, message})
		} else {
			this.socket.emit(Chat.EVENT.CHANNEL_MESSAGE, {
				channelName: name,
				message: {
					source: "---",
					date: new Date(),
					content: `You are not the owner of ${name}`,
				}
			})
		}
	}

	/**
	 * @param {string} name
	 */
	async channelDelete(name) {
		if(typeof name !== "string") {
			return
		}
		const collection = this.chat.database.collection("channels")
		const channel = await collection.findOne({ name })
		if (typeof channel === "undefined") {
			this.socket.emit(Chat.EVENT.NETWORK_MESSAGE, {
				message: {
					source: "---",
					date: new Date(),
					content: `${name} does not exist`,
				}
			})
		} else if(channel.owner === this.data.nickname) {
			this.io.in(name).emit(Chat.EVENT.CHANNEL_LEAVE, name)
			this.socket.leave(name)
			await collection.deleteOne({ name })
		} else {
			this.socket.emit(Chat.EVENT.CHANNEL_MESSAGE, {
				channelName: name,
				message: {
					source: "---",
					date: new Date(),
					content: `You are not the owner of ${name}`,
				}
			})
		}
	}

}

export default ChannelEventListener
